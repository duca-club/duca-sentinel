from duca_sentinel.lib.feature_flags import FlagConfiguration, flag
from duca_sentinel.lib.news.news_gate import NEWS_POSTING_FEATURE_KEY


def _decide(provider: FlagConfiguration | None) -> bool:
	if provider is None:
		return False

	return provider.enabled is True


news_flag = flag(
	key=NEWS_POSTING_FEATURE_KEY,
	description="Enables scheduled news digest and keyword alert posts",
	decide=_decide,
)
