from duca_sentinel.lib.feature_flags import FlagConfiguration, flag


def _decide(provider: FlagConfiguration | None) -> bool:
	# If no provider data is available, treat the flag as disabled by default.
	if provider is None:
		return False

	return provider.enabled is True


verify_member_flag = flag(
	key="verify-member",
	description="Controls availability of the /verify membership command",
	decide=_decide,
)
