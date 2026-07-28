from collections.abc import Sequence
from typing import Literal

from supabase import PostgrestAPIError

from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase

NewsPostSource = Literal["digest", "alert"]

#: Postgres error code for a unique constraint violation.
UNIQUE_VIOLATION = "23505"


async def fetch_posted_keys(keys: Sequence[str]) -> set[str]:
	if len(keys) == 0:
		return set()

	try:
		response = (
			await supabase.table("news_posted_items").select("article_key").in_("article_key", list(keys)).execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[news/Dedupe] fetch_posted_keys failed: {error}")
		raise

	return {row["article_key"] for row in (response.data or []) if isinstance(row.get("article_key"), str)}


async def claim_posted(article_key: str, source: NewsPostSource) -> bool:
	"""
	Atomically claims an article key (dedupe gate).
	Returns True only for the first caller across all tasks/processes.
	"""
	try:
		await supabase.table("news_posted_items").insert({"article_key": article_key, "source": source}).execute()
	except PostgrestAPIError as error:
		# Unique violation: already recorded
		if error.code == UNIQUE_VIOLATION:
			return False
		Logger.error(f"[news/Dedupe] Failed to mark post: {error}")
		raise

	return True


async def unclaim_posted(article_key: str) -> None:
	"""Rollback if claimed but failed to post."""
	try:
		await supabase.table("news_posted_items").delete().eq("article_key", article_key).execute()
	except PostgrestAPIError as error:
		Logger.error(f"[news/Dedupe] Failed to unclaim posted item: {error}")
