"""Process uptime, anchored the first time this module is imported (i.e. at startup)."""

import time

_PROCESS_START = time.monotonic()


def get_uptime_seconds() -> float:
	"""Seconds elapsed since the process started."""
	return time.monotonic() - _PROCESS_START
