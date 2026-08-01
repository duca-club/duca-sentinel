"""
Per-platform switches for automatic publishing.

Off means the post is handed to a person instead, which is what the platform did before
Zernio existed and is still the behaviour anyone would want back if a publish goes wrong.
Defaulting to off matters: an account can be connected to Zernio for testing long before
the club is ready for the bot to post as DUCA without anyone looking.
"""

from duca_sentinel.lib.feature_flags import FlagConfiguration, flag

INSTAGRAM_PUBLISH_FEATURE_KEY = "publish_instagram"
LINKEDIN_PUBLISH_FEATURE_KEY = "publish_linkedin"


def _decide(provider: FlagConfiguration | None) -> bool:
	if provider is None:
		return False

	return provider.enabled is True


instagram_publish_flag = flag(
	key=INSTAGRAM_PUBLISH_FEATURE_KEY,
	description="Publishes due Instagram posts through Zernio instead of handing them to a person",
	decide=_decide,
)

linkedin_publish_flag = flag(
	key=LINKEDIN_PUBLISH_FEATURE_KEY,
	description="Publishes due LinkedIn posts through Zernio instead of handing them to a person",
	decide=_decide,
)

#: Looked up by the row's own platform value, so a new platform is one entry rather than
#: a branch in the dispatcher.
PUBLISH_FLAGS = {
	"instagram": instagram_publish_flag,
	"linkedin": linkedin_publish_flag,
}
