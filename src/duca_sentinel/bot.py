import discord
from discord.ext import commands

from duca_sentinel.app.commands.global_middleware import on_app_command_error
from duca_sentinel.app.events.client_ready import log as client_ready_log
from duca_sentinel.app.events.client_ready import set_activity as client_ready_set_activity
from duca_sentinel.app.events.client_ready import sync_channels as client_ready_sync_channels

# Importing the task modules registers their cron schedules with the task registry.
from duca_sentinel.app.tasks import announcement_dispatch, news_alerts, news_digest  # noqa: F401
from duca_sentinel.lib import emojis
from duca_sentinel.lib.feature_flags import set_flag_provider
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.tasks import start_scheduled_tasks
from duca_sentinel.providers.supabase_flag_provider import SupabaseFlagProvider

intents = discord.Intents.none()
intents.guilds = True
intents.members = True
intents.guild_messages = True
intents.message_content = True

# Configure global feature flag provider
set_flag_provider(SupabaseFlagProvider())

#: Command modules loaded as extensions at startup.
COMMAND_EXTENSIONS = (
	"duca_sentinel.app.commands.info.ping",
	"duca_sentinel.app.commands.info.whoami",
	"duca_sentinel.app.commands.utility.verify",
)


class DucaSentinel(commands.Bot):
	def __init__(self) -> None:
		super().__init__(command_prefix=commands.when_mentioned, intents=intents, help_command=None)

	async def setup_hook(self) -> None:
		for extension in COMMAND_EXTENSIONS:
			await self.load_extension(extension)

		self.tree.on_error = on_app_command_error

		# Resolve the application's custom emoji before anything can render a message with them.
		await emojis.load(self)

		# Publish the command set to Discord; global commands can take up to an hour to propagate.
		synced = await self.tree.sync()
		Logger.info(f"Synced {len(synced)} application command(s)")

	async def on_ready(self) -> None:
		await client_ready_log.handler(self)
		await client_ready_set_activity.handler(self)
		await client_ready_sync_channels.handler(self)

		# Reconnects re-fire this event; scheduling is guarded so it only takes effect once.
		start_scheduled_tasks(self)


client = DucaSentinel()
