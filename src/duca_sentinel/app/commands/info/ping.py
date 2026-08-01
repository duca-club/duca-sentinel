import discord
from discord import app_commands
from discord.ext import commands

#: CommandKit resolved these for message commands only; they are never registered with Discord.
ALIASES = ["latency"]


class Ping(commands.Cog):
	def __init__(self, bot: commands.Bot) -> None:
		self.bot = bot

	@app_commands.command(name="ping", description="View bot latency metrics")
	async def ping(self, interaction: discord.Interaction) -> None:
		await interaction.response.defer()

		# Calculate interaction latency
		reply = await interaction.original_response()
		interaction_latency = round((reply.created_at - interaction.created_at).total_seconds() * 1000)

		gateway_latency = round(self.bot.latency * 1000)

		# Retrieve bot avatar URL for embed thumbnail
		bot_avatar_url = self.bot.user.avatar.url if self.bot.user and self.bot.user.avatar else None

		ping_embed = discord.Embed(
			title="$ ping",
			description=(
				"Gateway latency shows bot <-> Discord connection delay, "
				"and interaction latency shows command response time."
			),
			colour=0x006DD4,
		)
		ping_embed.add_field(name="Gateway Latency", value=f"{gateway_latency}ms", inline=True)
		ping_embed.add_field(name="Interaction Latency", value=f"{interaction_latency}ms", inline=True)
		ping_embed.set_footer(text="Pong!")

		if bot_avatar_url:
			ping_embed.set_thumbnail(url=bot_avatar_url)

		await interaction.edit_original_response(embed=ping_embed)


async def setup(bot: commands.Bot) -> None:
	await bot.add_cog(Ping(bot))
