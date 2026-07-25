"""Feature flag provider backed by the Supabase `feature_flags` table."""

from supabase import PostgrestAPIError

from duca_sentinel.lib.feature_flags import FlagConfiguration
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.supabase_client import supabase


class SupabaseFlagProvider:
	async def get_flag(self, key: str) -> FlagConfiguration | None:
		try:
			response = (
				await supabase.table("feature_flags")
				.select("feature, enabled")
				.eq("feature", key)
				.maybe_single()
				.execute()
			)
		except PostgrestAPIError as error:
			Logger.error(f"[featureFlags] get_flag({key}) failed error={error}")
			return None

		if response is None:
			return None

		return FlagConfiguration(enabled=response.data["enabled"])

	async def has_flag(self, key: str) -> bool:
		try:
			response = (
				await supabase.table("feature_flags").select("feature").eq("feature", key).maybe_single().execute()
			)
		except PostgrestAPIError as error:
			Logger.error(f"[featureFlags] has_flag({key}) failed error={error}")
			return False

		return response is not None
