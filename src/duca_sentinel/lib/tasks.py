"""
Cron-scheduled background tasks.

Modules under `app/tasks` declare their schedule with `task()` at import time; `start_scheduled_tasks`
then hands the registry to APScheduler once the bot is connected. Schedules live in code rather than
in a store, so there is nothing to persist across restarts - every task re-registers on boot, and runs
missed while the process was down are skipped rather than replayed.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from discord.ext import commands

from duca_sentinel.lib.logger import Logger


class TaskContext:
	"""Passed to a task's `execute`, giving it access to the connected bot."""

	def __init__(self, client: commands.Bot) -> None:
		self.client = client


@dataclass(frozen=True)
class Task:
	name: str
	schedule: str
	timezone: str
	execute: Callable[[TaskContext], Awaitable[None]]
	prepare: Callable[[], Awaitable[bool]] | None = None


_registry: list[Task] = []
_scheduler = AsyncIOScheduler()


def task(
	name: str,
	schedule: str,
	timezone: str,
	execute: Callable[[TaskContext], Awaitable[None]],
	prepare: Callable[[], Awaitable[bool]] | None = None,
) -> Task:
	"""
	Registers a task to run on a cron schedule.

	:param name: Unique task identifier, used as the scheduler job id.
	:param schedule: Standard five-field crontab expression.
	:param timezone: IANA timezone the schedule is interpreted in.
	:param execute: The work to perform on each run.
	:param prepare: Optional gate; when it returns False the run is skipped.
	"""
	registered = Task(name=name, schedule=schedule, timezone=timezone, execute=execute, prepare=prepare)
	_registry.append(registered)
	return registered


async def _run(registered: Task, client: commands.Bot) -> None:
	try:
		if registered.prepare is not None and not await registered.prepare():
			return
		await registered.execute(TaskContext(client))
	except Exception as error:
		# A task raising must never take down the scheduler, so log and let the next run try again.
		Logger.error(f"[tasks] '{registered.name}' failed: {error}")


def start_scheduled_tasks(client: commands.Bot) -> None:
	"""Schedules every registered task. Safe to call again on reconnect; only the first call takes effect."""
	if _scheduler.running:
		return

	for registered in _registry:
		_scheduler.add_job(
			_run,
			CronTrigger.from_crontab(registered.schedule, timezone=ZoneInfo(registered.timezone)),
			args=[registered, client],
			id=registered.name,
			replace_existing=True,
		)
		Logger.info(f"[tasks] Scheduled '{registered.name}' ({registered.schedule} {registered.timezone})")

	_scheduler.start()
