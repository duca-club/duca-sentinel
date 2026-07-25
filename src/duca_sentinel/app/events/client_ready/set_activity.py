import discord
from discord.ext import commands

from duca_sentinel.lib.logger import Logger


async def handler(client: commands.Bot) -> None:
	await client.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="DUCA 👀"))
	Logger.info("Set Activity: Watching DUCA 👀")
