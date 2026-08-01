import discord

from duca_sentinel.flags.social_publish_flags import PUBLISH_FLAGS
from duca_sentinel.lib import zernio
from duca_sentinel.lib.emojis import DUCA_LOGO
from duca_sentinel.lib.emojis import get as emoji
from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.social_queue import (
	claim_due,
	in_flight,
	mark_accepted,
	mark_failed,
	mark_failed_outright,
	mark_handed_off,
	mark_published,
	requeue_stale_claims,
)
from duca_sentinel.lib.tasks import TaskContext, task

#: Minute accuracy is plenty. Nothing downstream of this is waiting on seconds - either an
#: API call is in flight or a person is about to read a message.
DISPATCH_CRON = "* * * * *"
DISPATCH_TIMEZONE = "UTC"

PLATFORM_LABEL = {"instagram": "Instagram", "linkedin": "LinkedIn"}

#: Discord rejects a message over 2000 characters. A LinkedIn post plus its images and the
#: framing around them can reach that, so the caption is cut with a pointer back to the
#: platform rather than the whole hand-off being lost.
CAPTION_LIMIT = 1200


def _block(caption: str) -> str:
	"""Wraps the caption so it can be copied out without Discord eating the markdown."""
	if len(caption) > CAPTION_LIMIT:
		caption = caption[:CAPTION_LIMIT].rstrip() + "\n\n[…truncated - copy the full text from the platform]"
	# Backticks in a caption would close the fence early, so they are neutralised rather
	# than the whole block being abandoned.
	return "```\n" + caption.replace("```", "'''") + "\n```"


def _handoff_message(row: dict, reason: str | None) -> str:
	platform = PLATFORM_LABEL.get(row["platform"], row["platform"])
	headline = f"{emoji(DUCA_LOGO)} **{platform} post is due** — {row['title']}"
	if reason:
		# Not buried at the bottom: whoever reads this needs to know straight away that the
		# automatic attempt failed, because it may fail again next time.
		headline += f"\n:warning: Automatic publishing failed, so this needs posting by hand.\n> {reason}"

	lines = [headline, "", _block(row["caption"])]

	if row.get("first_comment"):
		lines += ["**First comment**", _block(row["first_comment"])]

	media = row.get("media") or []
	if media:
		lines.append("**Images** (in order)")
		lines += [f"{index}. <{item['url']}>" for index, item in enumerate(media, start=1)]

	if row.get("link_url"):
		lines.append(f"**Link** <{row['link_url']}>")

	lines += ["", "-# Post it, then mark it as posted on the platform so it stops asking."]
	return "\n".join(lines)


async def _hand_off(client: discord.Client, row: dict, reason: str | None = None) -> None:
	"""
	Puts the finished post in front of a person.

	This is both the normal route for a platform that is not wired up and the fallback for
	one that is: a post that Zernio refused still has to go out, and the club would rather
	hear about it in the channel they are already in than find it days later on a page.
	"""
	channel_id = env_config.SOCIAL_HANDOFF_CHANNEL_ID
	if not channel_id:
		await mark_failed_outright(row["id"], reason or "No hand-off channel is configured")
		Logger.error(f"[socials] '{row['title']}' is due but SOCIAL_HANDOFF_CHANNEL_ID is unset")
		return

	channel = client.get_channel(int(channel_id)) or await client.fetch_channel(int(channel_id))
	if not isinstance(channel, discord.TextChannel):
		await mark_failed_outright(row["id"], reason or f"Channel {channel_id} is not a text channel")
		Logger.error(f"[socials] Channel {channel_id} is not a text channel the bot can post in")
		return

	await channel.send(_handoff_message(row, reason))
	await mark_handed_off(row["id"])
	Logger.info(f"[socials] Handed off '{row['title']}' to #{channel.name}")


async def _publish(row: dict) -> None:
	"""
	Sends the post to Zernio.

	Raises rather than recording its own failure: everything that can go wrong here has the
	same answer, which is to hand the post to a person, and that decision belongs to the
	caller rather than to five separate branches in here.
	"""
	platform = row["platform"]

	account = await zernio.account_for(platform)
	if not account:
		raise zernio.ZernioError(f"No {platform} account is connected to Zernio")

	organization_urn = None
	if platform == "linkedin":
		organization_urn = env_config.ZERNIO_LINKEDIN_ORGANIZATION_URN
		if not organization_urn:
			# Publishing anyway would put a DUCA announcement out under a student's name.
			raise zernio.ZernioError("ZERNIO_LINKEDIN_ORGANIZATION_URN is unset, so the post would go out personally")

	post = await zernio.publish(zernio.build_payload(row, account["_id"], organization_urn))
	await mark_accepted(row["id"], post["_id"])

	# Zernio accepts first and publishes after, so the URL usually is not there yet. The
	# reconcile pass below picks it up on a later tick.
	if post.get("status") in zernio.TERMINAL_OK:
		await mark_published(row["id"], zernio.live_url(post))
		Logger.info(f"[socials] Published '{row['title']}' to {platform}")


async def _reconcile() -> None:
	"""Reads back posts Zernio has accepted but not finished."""
	for row in await in_flight():
		try:
			post = await zernio.get_post(row["external_id"])
		except zernio.ZernioError as error:
			Logger.error(f"[socials] Could not read back '{row['title']}': {error}")
			continue

		status = post.get("status")
		if status in zernio.TERMINAL_OK:
			await mark_published(row["id"], zernio.live_url(post))
			Logger.info(f"[socials] Published '{row['title']}' to {row['platform']}")
		elif status in zernio.TERMINAL_BAD:
			# Deliberately not handed off from here. The post is already through to Zernio,
			# and asking someone to post it by hand risks a duplicate if Zernio recovers.
			await mark_failed_outright(row["id"], zernio.failure_reason(post))
			Logger.error(f"[socials] '{row['title']}' failed at Zernio: {zernio.failure_reason(post)}")


async def _execute(ctx: TaskContext) -> None:
	await requeue_stale_claims()

	if zernio.configured():
		await _reconcile()

	for row in await claim_due():
		platform = row["platform"]
		flag = PUBLISH_FLAGS.get(platform)
		automatic = zernio.configured() and flag is not None and await flag()

		if not automatic:
			await _hand_off(ctx.client, row)
			continue

		try:
			await _publish(row)
		except Exception as error:
			# Every failure lands here on purpose, including ones that are really config
			# problems. The post is due either way, and a person can still post it.
			reason = str(error)
			await mark_failed(row["id"], reason)
			Logger.error(f"[socials] Could not publish '{row['title']}': {reason}")
			try:
				await _hand_off(ctx.client, row, reason)
			except Exception as fallback_error:
				await mark_failed_outright(row["id"], reason)
				Logger.error(f"[socials] Hand-off also failed for '{row['title']}': {fallback_error}")


task(
	name="social-dispatch",
	schedule=DISPATCH_CRON,
	timezone=DISPATCH_TIMEZONE,
	execute=_execute,
)
