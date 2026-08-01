import discord

from duca_sentinel.lib.emojis import DUCA_LOGO
from duca_sentinel.lib.emojis import get as emoji
from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.social_queue import claim_due, mark_handed_off, requeue_stale_handoffs
from duca_sentinel.lib.tasks import TaskContext, task

#: Minute accuracy is plenty here - a human is going to read it and then go and post it.
HANDOFF_CRON = "* * * * *"
HANDOFF_TIMEZONE = "UTC"

PLATFORM_LABEL = {"instagram": "Instagram", "linkedin": "LinkedIn"}

#: Discord truncates a message at 2000 characters. A LinkedIn post plus its images and the
#: framing around them can reach that, so the caption is cut with a pointer back to the
#: platform rather than the whole message being rejected.
CAPTION_LIMIT = 1200


def _block(caption: str) -> str:
	"""Wraps the caption so it can be copied out without Discord eating the markdown."""
	if len(caption) > CAPTION_LIMIT:
		caption = caption[:CAPTION_LIMIT].rstrip() + "\n\n[…truncated - copy the full text from the platform]"
	# Backticks in a caption would close the fence early, so they are neutralised rather
	# than the whole block being abandoned.
	return "```\n" + caption.replace("```", "'''") + "\n```"


def _message(row: dict) -> str:
	platform = PLATFORM_LABEL.get(row["platform"], row["platform"])
	lines = [
		f"{emoji(DUCA_LOGO)} **{platform} post is due** — {row['title']}",
		"",
		_block(row["caption"]),
	]

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


async def _execute(ctx: TaskContext) -> None:
	if not env_config.SOCIAL_HANDOFF_CHANNEL_ID:
		return

	await requeue_stale_handoffs()

	due = await claim_due()
	if not due:
		return

	channel_id = int(env_config.SOCIAL_HANDOFF_CHANNEL_ID)
	channel = ctx.client.get_channel(channel_id) or await ctx.client.fetch_channel(channel_id)
	if not isinstance(channel, discord.TextChannel):
		Logger.error(f"[socials] Channel {channel_id} is not a text channel the bot can post in")
		return

	for row in due:
		try:
			await channel.send(_message(row))
			await mark_handed_off(row["id"])
			Logger.info(f"[socials] Handed off '{row['title']}' to #{channel.name}")
		except Exception as error:
			# Left claimed on purpose: the stale sweep will put it back, which is better
			# than dropping it into the queue again immediately and posting twice.
			Logger.error(f"[socials] Failed to hand off '{row['title']}': {error}")


task(
	name="social-handoff",
	schedule=HANDOFF_CRON,
	timezone=HANDOFF_TIMEZONE,
	execute=_execute,
)
