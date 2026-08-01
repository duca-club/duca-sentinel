from duca_sentinel.providers.supabase_flag_provider import SupabaseFlagProvider

#: Same key as `news_flag` (../../flags/news_flag.py)
NEWS_POSTING_FEATURE_KEY = "news-posting"

_flag_provider = SupabaseFlagProvider()


async def is_news_posting_enabled() -> bool:
	config = await _flag_provider.get_flag(NEWS_POSTING_FEATURE_KEY)
	return config is not None and config.enabled is True
