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
)
