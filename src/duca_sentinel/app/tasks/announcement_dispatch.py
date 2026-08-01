import discord
from sentinel_render.discord_message import build_view
from sentinel_render.payload import Announcement

from duca_sentinel.lib.announcement_media import stage_attachments
from duca_sentinel.lib.announcement_queue import claim_due, mark_failed, mark_sent, requeue_stale_claims
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.tasks import TaskContext, task

#: Every minute, but checked four times within it. Scheduled posts only need minute
#: accuracy; the finer tick is so "post now" lands in a few seconds rather than feeling
#: like it hung.
DISPATCH_CRON = "* * * * *"
DISPATCH_SECONDS = "*/15"
DISPATCH_TIMEZONE = "UTC"


async def _deliver(client: discord.Client, row: dict) -> None:
	announcement = Announcement.from_dict(row["payload"])
	channel_id = int(row["channel_id"])

	channel = client.get_channel(channel_id) or await client.fetch_channel(channel_id)
	if not isinstance(channel, discord.TextChannel):
		raise RuntimeError(f"Channel {channel_id} is not a text channel the bot can post in")

	# Upload the media rather than letting Discord hotlink it; its image proxy resolves
	# external URLs unreliably and silently posts a broken tile when it fails.
	announcement, files = await stage_attachments(announcement)

	message = await channel.send(view=build_view(announcement), files=files)
	await mark_sent(row["id"], message.id)
	Logger.info(f"[announcements] Posted '{row['title']}' to #{channel.name}")


async def _execute(ctx: TaskContext) -> None:
	await requeue_stale_claims()

	for row in await claim_due():
		try:
			await _deliver(ctx.client, row)
		except Exception as error:
			# The row is already claimed, so a failure has to be recorded or it would sit
			# in `sending` until the stale sweep picks it up.
			await mark_failed(row["id"], str(error))
			Logger.error(f"[announcements] Failed to post '{row['title']}': {error}")


task(
	name="announcement-dispatch",
	schedule=DISPATCH_CRON,
	timezone=DISPATCH_TIMEZONE,
	execute=_execute,
	second=DISPATCH_SECONDS,
)
