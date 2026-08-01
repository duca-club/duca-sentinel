"""Entry point. Configures logging, then connects the bot."""

from duca_sentinel.lib.logger import configure_logging

# Imported before anything else so the uptime anchor is as close to process start as possible.
from duca_sentinel.lib.uptime import get_uptime_seconds  # noqa: F401


def main() -> None:
	configure_logging()

	# Imported inside `main` so logging is configured before the environment is validated.
	from duca_sentinel.bot import client
	from duca_sentinel.lib.env_config import env_config

	# `log_handler=None` keeps discord.py from replacing the formatting installed above.
	client.run(env_config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
	main()
