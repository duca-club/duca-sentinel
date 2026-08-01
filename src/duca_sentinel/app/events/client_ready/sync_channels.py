import discord
from discord.ext import commands
from supabase import PostgrestAPIError

from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase

#: The composer preselects the first channel whose name starts with this. A prefix rather
#: than an exact name so "announcement", "announcements" and "announce" all qualify.
DEFAULT_CHANNEL_PREFIX = "announce"


async def handler(client: commands.Bot) -> None:
	"""
	Mirrors the guild's text channels into Supabase so the composer's dropdown matches the
	server. Runs on connect, which is often enough for a channel list that rarely changes.
	"""
	guild = client.get_guild(int(env_config.PLATFORM_GUILD_ID)) if env_config.PLATFORM_GUILD_ID else None
	if guild is None:
		Logger.warn("[channels] Guild not found, skipping channel sync")
		return

	postable = [
		channel
		for channel in guild.text_channels
		if channel.permissions_for(guild.me).send_messages and isinstance(channel, discord.TextChannel)
	]

	# Only one channel may be the default, so the earliest match wins rather than every
	# channel that happens to start with the prefix.
	default_id = next(
		(c.id for c in sorted(postable, key=lambda c: c.position) if c.name.startswith(DEFAULT_CHANNEL_PREFIX)),
		None,
	)

	rows = [
		{
			"id": str(channel.id),
			"name": channel.name,
			"category": channel.category.name if channel.category else None,
			"position": channel.position,
			"is_default": channel.id == default_id,
		}
		for channel in postable
	]

	if not rows:
		Logger.warn("[channels] No postable channels found")
		return

	try:
		await supabase.table("discord_channels").upsert(rows, on_conflict="id").execute()
	except PostgrestAPIError as error:
		Logger.error(f"[channels] Sync failed: {error}")
		return

	Logger.info(f"[channels] Synced {len(rows)} channel(s) to the platform")
