from discord.ext import commands

from duca_sentinel.lib.logger import Logger


async def handler(client: commands.Bot) -> None:
	Logger.info(f"Logged in as {client.user.name}!" if client.user else "Logged in!")
