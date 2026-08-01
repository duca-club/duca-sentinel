"""
Hand-off of Instagram and LinkedIn posts scheduled from the platform.

Nothing here posts to Instagram or LinkedIn. Neither platform lets a student club publish
programmatically without an approval process it will not get quickly, so a scheduled post
means "put this in front of a person at the right minute, finished". The claim is the same
`FOR UPDATE SKIP LOCKED` pattern the announcements queue uses, for the same reason: two bot
instances must not both nag the marketing channel about the same post.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from supabase import PostgrestAPIError

from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase

#: A post claimed but never delivered means the bot died mid-hand-off.
STALE_CLAIM_AFTER = timedelta(minutes=10)

CLAIM_BATCH = 5


async def requeue_stale_handoffs() -> int:
	"""
	Returns posts stuck mid-hand-off to the queue.

	Only ones nobody has touched: if someone has already recorded where it went, the row is
	`published` and this leaves it alone.
	"""
	cutoff = (datetime.now(UTC) - STALE_CLAIM_AFTER).isoformat()
	try:
		response = (
			await supabase.table("social_posts")
			.update({"status": "scheduled"})
			.eq("status", "awaiting_post")
			.is_("handed_off_at", "null")
			.lt("updated_at", cutoff)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Failed to requeue stale hand-offs: {error}")
		return 0

	count = len(response.data or [])
	if count:
		Logger.warn(f"[socials] Requeued {count} post(s) left mid-hand-off")
	return count


async def claim_due() -> list[dict[str, Any]]:
	"""Atomically takes ownership of every social post that is due to be handed off."""
	try:
		response = await supabase.rpc("claim_due_social_posts", {"max_rows": CLAIM_BATCH}).execute()
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Failed to claim due posts: {error}")
		return []
	return response.data or []


async def mark_handed_off(post_id: str) -> None:
	"""Records that the reminder actually reached Discord."""
	try:
		await (
			supabase.table("social_posts")
			.update({"handed_off_at": datetime.now(UTC).isoformat()})
			.eq("id", post_id)
			.execute()
		)
	except PostgrestAPIError as error:
		# The reminder is already in Discord, so this only costs the stale sweep a false
		# positive ten minutes from now.
		Logger.error(f"[socials] Handed off {post_id} but could not record it: {error}")
