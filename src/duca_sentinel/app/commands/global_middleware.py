"""Global handler for uncaught application command errors."""

import discord
from discord import app_commands

from duca_sentinel.lib.logger import Logger

ERROR_MESSAGE = "Something went wrong. Please try again later."


async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError) -> None:
	command_name = interaction.command.name if interaction.command else "unknown"
	Logger.error(f"[commands] '{command_name}' raised an unhandled error\n{error}")

	# Only handle slash (chat input) commands; skip autocomplete and other types
	if interaction.type is not discord.InteractionType.application_command:
		return

	try:
		if interaction.response.is_done():
			try:
				await interaction.edit_original_response(content=ERROR_MESSAGE)
			except discord.HTTPException:
				await interaction.followup.send(content=ERROR_MESSAGE, ephemeral=True)
		else:
			await interaction.response.send_message(content=ERROR_MESSAGE, ephemeral=True)
	except Exception as reply_error:
		Logger.error(f"Failed to send error message to user: {reply_error}")
