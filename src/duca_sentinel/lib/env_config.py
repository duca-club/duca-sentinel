"""
Configuration object built at startup by reading required and optional environment variables.
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Populate `os.environ` from `.env` before any variable is read. Values already present in the
# real environment win, so container/systemd configuration still overrides the file.
load_dotenv()


def get_env_var(name: str) -> str:
	"""
	Retrieves an environment variable and raises an error if it's not defined.

	:param name: Name of the environment variable to retrieve.
	:raises RuntimeError: If the environment variable is missing or empty.
	:returns: Value of the environment variable.
	"""
	value = os.environ.get(name)
	if not value:
		raise RuntimeError(f"Missing required environment variable: {name}")
	return value


def get_optional_env_var(name: str) -> str | None:
	"""
	Retrieves an optional environment variable.

	:param name: Name of the environment variable to retrieve.
	:returns: Value of the environment variable or None if not set.
	"""
	return os.environ.get(name)


@dataclass(frozen=True)
class EnvConfig:
	DISCORD_TOKEN: str
	MEMBER_ROLE_ID: str
	NEWS_ALERT_CRON: str
	NEWS_ALERT_KEYWORDS: str
	NEWS_CHANNEL_ID: str
	NEWS_DIGEST_CRON: str
	NEWS_FEED_URL: str
	NEWS_TIMEZONE: str
	PLATFORM_GUILD_ID: str | None
	SOCIAL_HANDOFF_CHANNEL_ID: str | None
	ZERNIO_API_KEY: str | None
	#: Only needed when more than one account of a platform is connected; without it the
	#: single connected account is used and two would be a coin toss.
	ZERNIO_ACCOUNT_OVERRIDES: dict[str, str]
	#: The DUCA company page, as `urn:li:organization:123456`. Without it a LinkedIn post
	#: would go out under the personal profile of whoever linked the account.
	ZERNIO_LINKEDIN_ORGANIZATION_URN: str | None
	SUPABASE_SECRET_KEY: str
	SUPABASE_URL: str


env_config = EnvConfig(
	DISCORD_TOKEN=get_env_var("DISCORD_TOKEN"),
	MEMBER_ROLE_ID=get_env_var("MEMBER_ROLE_ID"),
	SUPABASE_URL=get_env_var("SUPABASE_URL"),
	SUPABASE_SECRET_KEY=get_env_var("SUPABASE_SECRET_KEY"),
	NEWS_CHANNEL_ID=get_env_var("NEWS_CHANNEL_ID"),
	NEWS_FEED_URL="https://feeds.feedburner.com/TheHackersNews",
	NEWS_TIMEZONE=get_optional_env_var("NEWS_TIMEZONE") or "Australia/Sydney",
	NEWS_DIGEST_CRON=get_optional_env_var("NEWS_DIGEST_CRON") or "0 9,17 * * *",
	NEWS_ALERT_CRON=get_optional_env_var("NEWS_ALERT_CRON") or "0 * * * *",
	NEWS_ALERT_KEYWORDS=get_optional_env_var("NEWS_ALERT_KEYWORDS") or "critical,zero-day,zero day",
	# The guild the staff platform manages. Optional so the bot still runs standalone.
	PLATFORM_GUILD_ID=get_optional_env_var("PLATFORM_GUILD_ID"),
	# Where scheduled Instagram and LinkedIn posts get handed to a person. Optional: without
	# it the hand-off task stays asleep rather than guessing at a channel.
	SOCIAL_HANDOFF_CHANNEL_ID=get_optional_env_var("SOCIAL_HANDOFF_CHANNEL_ID"),
	# Publishing to Instagram and LinkedIn. Optional: without a key, and until the feature
	# flags are switched on, every due post is handed to a person instead.
	ZERNIO_API_KEY=get_optional_env_var("ZERNIO_API_KEY"),
	ZERNIO_ACCOUNT_OVERRIDES={
		platform: value
		for platform in ("instagram", "linkedin")
		if (value := get_optional_env_var(f"ZERNIO_{platform.upper()}_ACCOUNT_ID"))
	},
	ZERNIO_LINKEDIN_ORGANIZATION_URN=get_optional_env_var("ZERNIO_LINKEDIN_ORGANIZATION_URN"),
)
