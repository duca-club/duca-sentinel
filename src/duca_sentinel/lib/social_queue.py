"""
The queue behind scheduled Instagram and LinkedIn posts.

A due post is claimed once and then goes one of two ways: published through Zernio, or
handed to a person in a staff channel with everything ready to paste. The claim does not
care which - it only guarantees that one process owns the row - so both routes start from
`publishing` and the task decides.

The claim is the same `FOR UPDATE SKIP LOCKED` pattern the announcements queue uses, for
the same reason: two bot instances must not both post, or both nag the same channel.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from supabase import PostgrestAPIError

from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase

#: A post left mid-flight this long means the bot died between claiming and resolving it.
STALE_CLAIM_AFTER = timedelta(minutes=10)

CLAIM_BATCH = 5


async def requeue_stale_claims() -> int:
	"""
	Returns posts stuck mid-flight to the queue.

	Only `publishing` rows, never `awaiting_post`: once a reminder has reached Discord a
	person owns the post, and requeueing it would ask a second person to post it again.
	"""
	cutoff = (datetime.now(UTC) - STALE_CLAIM_AFTER).isoformat()
	try:
		response = (
			await supabase.table("social_posts")
			.update({"status": "scheduled"})
			.eq("status", "publishing")
			.is_("external_id", "null")
			.lt("updated_at", cutoff)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Failed to requeue stale claims: {error}")
		return 0

	count = len(response.data or [])
	if count:
		Logger.warn(f"[socials] Requeued {count} post(s) left mid-flight")
	return count


async def claim_due() -> list[dict[str, Any]]:
	"""Atomically takes ownership of every social post that is due."""
	try:
		response = await supabase.rpc("claim_due_social_posts", {"max_rows": CLAIM_BATCH}).execute()
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Failed to claim due posts: {error}")
		return []
	return response.data or []


async def _update(post_id: str, changes: dict[str, Any], what: str) -> None:
	try:
		await supabase.table("social_posts").update(changes).eq("id", post_id).execute()
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Could not record {what} for {post_id}: {error}")


async def mark_handed_off(post_id: str) -> None:
	"""Records that the reminder reached Discord and a person now owns the post."""
	await _update(
		post_id,
		{"status": "awaiting_post", "handed_off_at": datetime.now(UTC).isoformat()},
		"hand-off",
	)


async def mark_accepted(post_id: str, external_id: str) -> None:
	"""
	Records Zernio's id the moment it accepts the post.

	Written before Zernio has finished publishing, on purpose: from here on the row is not
	safe to requeue, because doing so could publish the same post twice.
	"""
	await _update(post_id, {"external_id": external_id, "last_error": None}, "acceptance")


async def mark_published(post_id: str, url: str | None) -> None:
	await _update(
		post_id,
		{
			"status": "published",
			"posted_url": url,
			"posted_at": datetime.now(UTC).isoformat(),
			"last_error": None,
		},
		"publication",
	)


async def mark_failed(post_id: str, reason: str) -> None:
	"""
	Records why a post did not go out.

	The status is left for the caller to decide: a failure that was handed to a person is
	still going to be posted, and calling it `failed` would be a lie about what happened.
	"""
	await _update(post_id, {"last_error": reason[:500]}, "failure")


async def mark_failed_outright(post_id: str, reason: str) -> None:
	"""A failure nobody picked up. Someone has to look at this one."""
	await _update(post_id, {"status": "failed", "last_error": reason[:500]}, "failure")


async def in_flight() -> list[dict[str, Any]]:
	"""Posts Zernio has accepted but not yet finished, oldest first."""
	try:
		response = (
			await supabase.table("social_posts")
			.select("id, title, platform, external_id")
			.eq("status", "publishing")
			.not_.is_("external_id", "null")
			.order("updated_at")
			.limit(CLAIM_BATCH)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[socials] Failed to list in-flight posts: {error}")
		return []
	return response.data or []
