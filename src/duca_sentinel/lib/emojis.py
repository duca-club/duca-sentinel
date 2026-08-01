"""
Custom emoji used in the bot's messages.

Icons are looked up by name against the emoji uploaded to the Discord *application*, which
render anywhere the app posts rather than only inside the server that owns them. Application
emoji IDs differ per application, so resolving by name keeps one source working against
production and any test app that has the assets in `emojis/` uploaded to it.

Until those assets are uploaded to an application, lookups fall back to the DUCA guild emoji
the bot has always used. That keeps behaviour identical in the DUCA server - where the bot is
a member and can render them - without needing the upload to happen first.
"""

from discord.ext import commands

from duca_sentinel.lib.logger import Logger

NEWSPAPER = "newspaper_bold_96px_00aeef"
WARNING_CIRCLE = "warningcircle_bold_96px_ff3333"
RSS_SIMPLE = "rsssimple_bold_96px_00aeef"
DUCA_LOGO = "duca_logo"
USER = "user_bold_96px_00aeef"
LINKTREE = "linktree_bold__96px_00aeef"
GITHUB = "github_bold_96px_00aeef"

#: Every emoji the bot renders. Anything missing from the application is reported at startup.
REQUIRED = (NEWSPAPER, WARNING_CIRCLE, RSS_SIMPLE, DUCA_LOGO, USER, LINKTREE, GITHUB)

#: Emoji owned by the DUCA guild. Only renders where the bot shares that guild, so it is a
#: fallback for applications that have not had the `emojis/` assets uploaded to them yet.
LEGACY_GUILD_EMOJI = {
	NEWSPAPER: "<:newspaper_bold_96px_00aeef:1494581919185371156>",
	WARNING_CIRCLE: "<:warningcircle_bold_96px_ff3333:1494581625571512330>",
	RSS_SIMPLE: "<:rsssimple_bold_96px_00aeef:1494581920808566826>",
	DUCA_LOGO: "<:duca_logo:1494581566960173056>",
	USER: "<:user_bold_96px_00aeef:1503237142753841212>",
	LINKTREE: "<:linktree_bold__96px_00aeef:1503237140836909109>",
	GITHUB: "<:github_bold_96px_00aeef:1503237138643288154>",
}

_registry: dict[str, str] = {}


async def load(client: commands.Bot) -> None:
	"""
	Caches the application's emoji by name. Called once the client can reach the API.

	Failures are logged rather than raised: lookups fall back to the guild emoji, so a message
	still sends either way, which beats taking a command or a scheduled post down entirely.
	"""
	try:
		emojis = await client.fetch_application_emojis()
	except Exception as error:
		Logger.error(f"[emojis] Failed to fetch application emoji, falling back to guild emoji\n{error}")
		return

	_registry.clear()
	for emoji in emojis:
		_registry[emoji.name] = str(emoji)

	missing = [name for name in REQUIRED if name not in _registry]
	if missing:
		Logger.warn(f"[emojis] Not uploaded to this application, falling back to guild emoji: {', '.join(missing)}")

	Logger.info(f"[emojis] Loaded {len(_registry)} application emoji")


def get(name: str) -> str:
	"""Returns the `<:name:id>` token for `name`, preferring application emoji over guild emoji."""
	return _registry.get(name) or LEGACY_GUILD_EMOJI.get(name, "")
