"""
Delivery of announcements scheduled from the platform.

The platform never posts to Discord itself; it writes a row and this module picks it up.
Claiming goes through the `claim_due_announcements` function rather than a select followed
by an update, so two bot instances take different rows instead of both posting the same
announcement.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from supabase import PostgrestAPIError

from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase

#: A row claimed but never resolved means the bot died mid-send. After this long it goes
#: back on the queue; long enough that a slow Discord call is never mistaken for a crash.
STALE_CLAIM_AFTER = timedelta(minutes=10)

#: How many announcements one tick will take. Keeps a backlog from monopolising the loop.
CLAIM_BATCH = 5


async def requeue_stale_claims() -> int:
	"""
	Returns announcements stuck mid-send to the queue.

	:returns: How many rows were requeued.
	"""
	cutoff = (datetime.now(UTC) - STALE_CLAIM_AFTER).isoformat()
	try:
		response = (
			await supabase.table("announcements")
			.update({"status": "scheduled"})
			.eq("status", "sending")
			.lt("claimed_at", cutoff)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[announcements] Failed to requeue stale claims: {error}")
		return 0

	count = len(response.data or [])
	if count:
		Logger.warn(f"[announcements] Requeued {count} announcement(s) left mid-send")
	return count


async def claim_due() -> list[dict[str, Any]]:
	"""
	Atomically takes ownership of every announcement that is due.

	:returns: The claimed rows, already moved to the `sending` state.
	"""
	try:
		response = await supabase.rpc("claim_due_announcements", {"max_rows": CLAIM_BATCH}).execute()
	except PostgrestAPIError as error:
		Logger.error(f"[announcements] Failed to claim due announcements: {error}")
		return []
	return response.data or []


async def mark_sent(announcement_id: str, message_id: int) -> None:
	try:
		await (
			supabase.table("announcements")
			.update(
				{
					"status": "sent",
					"sent_at": datetime.now(UTC).isoformat(),
					"discord_message_id": str(message_id),
					"last_error": None,
				}
			)
			.eq("id", announcement_id)
			.execute()
		)
	except PostgrestAPIError as error:
		# The message is already in Discord, so this only costs an inaccurate status.
		Logger.error(f"[announcements] Posted {announcement_id} but could not record it: {error}")


async def mark_failed(announcement_id: str, reason: str) -> None:
	try:
		await (
			supabase.table("announcements")
			.update({"status": "failed", "last_error": reason[:500]})
			.eq("id", announcement_id)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[announcements] Could not record failure for {announcement_id}: {error}")
