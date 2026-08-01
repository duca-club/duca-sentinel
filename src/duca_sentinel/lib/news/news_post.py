from datetime import UTC, datetime
from typing import Literal
from zoneinfo import ZoneInfo

import discord
from discord import ui
from discord.ext import commands

from duca_sentinel.lib.components import ContainerView
from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger

NewsThreadType = Literal["digest", "alert"]

#: `ThreadAutoArchiveDuration.OneDay`, in minutes.
ONE_DAY_MINUTES = 1440


def _format_thread_timestamp(now: datetime) -> str:
	time_zone = ZoneInfo(env_config.NEWS_TIMEZONE)
	local = now.astimezone(time_zone)

	day_period = local.strftime("%p").upper()
	return f"{local.strftime('%I:%M')} {day_period} | {local.strftime('%d/%m/%Y')}"


def _thread_label(thread_type: NewsThreadType) -> str:
	return "Critical Alert" if thread_type == "alert" else "Daily Digest"


async def post_news_with_discussion_thread(
	client: commands.Bot,
	container: ui.Container,
	thread_type: NewsThreadType,
) -> None:
	target_channel_id = env_config.NEWS_CHANNEL_ID

	channel = client.get_channel(int(target_channel_id))
	if channel is None:
		try:
			channel = await client.fetch_channel(int(target_channel_id))
		except (discord.NotFound, discord.Forbidden, discord.HTTPException):
			channel = None

	if not isinstance(channel, discord.TextChannel):
		Logger.error(f"[news/post] Channel {target_channel_id} is not text-based, not sendable, or was not found")
		return

	message = await channel.send(view=ContainerView(container))

	now = datetime.now(UTC)
	label = _thread_label(thread_type)
	timestamp = _format_thread_timestamp(now)

	await message.create_thread(
		name=f"{label} @ {timestamp}",
		auto_archive_duration=ONE_DAY_MINUTES,
		reason=f"Cyber news {label.lower()} discussion thread",
	)
