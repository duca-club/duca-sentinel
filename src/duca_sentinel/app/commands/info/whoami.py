import discord
from discord import app_commands, ui
from discord.ext import commands

from duca_sentinel import __version__
from duca_sentinel.lib import emojis
from duca_sentinel.lib.uptime import get_uptime_seconds

#: CommandKit resolved these for message commands only; they are never registered with Discord.
ALIASES = ["about", "info"]


def _build_button_row() -> ui.View:
	view = ui.View(timeout=None)
	view.add_item(
		ui.Button(
			label="Join DUCA",
			emoji=emojis.get(emojis.USER) or None,
			style=discord.ButtonStyle.link,
			url="https://www.dusa.org.au/clubs/deakin-university-cybersecurity-association-burwood-duca",
		)
	)
	view.add_item(
		ui.Button(
			label="Socials",
			emoji=emojis.get(emojis.LINKTREE) or None,
			style=discord.ButtonStyle.link,
			url="https://linktr.ee/ducaclub",
		)
	)
	view.add_item(
		ui.Button(
			label="GitHub",
			emoji=emojis.get(emojis.GITHUB) or None,
			style=discord.ButtonStyle.link,
			url="https://github.com/duca-club/duca-sentinel",
		)
	)
	return view


class WhoAmI(commands.Cog):
	def __init__(self, bot: commands.Bot) -> None:
		self.bot = bot

	@app_commands.command(name="whoami", description="Learn more about DUCA Sentinel")
	async def whoami(self, interaction: discord.Interaction) -> None:
		await interaction.response.defer()

		# Calculate process uptime (days, hours, minutes, seconds)
		total_seconds = int(get_uptime_seconds())
		days = total_seconds // (60 * 60 * 24)
		hours = (total_seconds % (60 * 60 * 24)) // 3600
		minutes = (total_seconds % 3600) // 60
		seconds = total_seconds % 60
		uptime = f"{days}d {hours}h {minutes}m {seconds}s"

		# Retrieve bot avatar URL for embed thumbnail
		bot_avatar_url = self.bot.user.avatar.url if self.bot.user and self.bot.user.avatar else None

		reply_embed = discord.Embed(
			title="$ whoami",
			description=(
				"DUCA Sentinel is the official Discord bot developed for the "
				"Deakin University Cybersecurity Association (DUCA) Discord server."
			),
			colour=0x006DD4,
		)
		reply_embed.add_field(name="Version", value=f"`{__version__}`", inline=True)
		reply_embed.add_field(name="Uptime", value=f"`{uptime}`", inline=True)
		reply_embed.set_footer(text="made w/ <3 by dec1bel")

		if bot_avatar_url:
			reply_embed.set_thumbnail(url=bot_avatar_url)

		await interaction.edit_original_response(embed=reply_embed, view=_build_button_row())


async def setup(bot: commands.Bot) -> None:
	await bot.add_cog(WhoAmI(bot))
