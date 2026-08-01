"""
Fixed-window rate limiter.

A key's window opens on its first request and stays open for `interval` milliseconds, during
which at most `max_requests` requests are allowed. The window is not sliding: once it lapses, the
next request opens a fresh one.

Storage is pluggable so the counters can later be moved off-process (e.g. Redis) without touching
call sites; the default keeps them in memory, which suits a single bot instance.
"""

import time
from typing import Protocol

DEFAULT_TIMEOUT = 60_000
DEFAULT_MAX_REQUESTS = 10


def _now_ms() -> float:
	"""Current wall-clock time in milliseconds."""
	return time.time() * 1000


class RateLimitStorage(Protocol):
	"""Backing store for a rate limiter's per-key request counters."""

	async def get(self, key: str) -> int: ...

	async def set(self, key: str, value: int) -> None: ...

	async def delete(self, key: str) -> None: ...


class MemoryRateLimitStorage:
	"""In-memory storage implementation. Suitable for single-instance applications."""

	def __init__(self) -> None:
		self._store: dict[str, int] = {}

	async def get(self, key: str) -> int:
		return self._store.get(key, 0)

	async def set(self, key: str, value: int) -> None:
		self._store[key] = value

	async def delete(self, key: str) -> None:
		self._store.pop(key, None)


class RateLimiter:
	"""Enforces a request limit per key over a fixed time window."""

	def __init__(
		self,
		max_requests: int = DEFAULT_MAX_REQUESTS,
		interval: int = DEFAULT_TIMEOUT,
		storage: RateLimitStorage | None = None,
	) -> None:
		"""
		:param max_requests: Maximum number of requests allowed per interval.
		:param interval: Length of the rate limit window, in milliseconds.
		:param storage: Storage implementation to use.
		"""
		self.max_requests = max_requests
		self.interval = interval
		self.storage: RateLimitStorage = storage if storage is not None else MemoryRateLimitStorage()
		self._last_reset: dict[str, float] = {}

	async def limit(self, key: str) -> bool:
		"""
		Checks whether a request is allowed for the given key, consuming one slot if it is.

		:param key: Unique identifier for the rate limit entry.
		:returns: True if the request is allowed, False if rate limited.
		"""
		now = _now_ms()

		# The window has lapsed (or never opened): discard the old count and start a new window.
		if now - self._last_reset.get(key, 0) > self.interval:
			await self.storage.delete(key)
			self._last_reset[key] = now

		current_count = await self.storage.get(key)
		if current_count >= self.max_requests:
			return False

		await self.storage.set(key, current_count + 1)
		return True

	async def get_remaining(self, key: str) -> int:
		"""
		Gets the number of requests still allowed for a given key in the current window.

		:param key: Unique identifier for the rate limit entry.
		:returns: Number of remaining requests.
		"""
		current_count = await self.storage.get(key)
		return max(0, self.max_requests - current_count)

	async def get_reset_time(self, key: str) -> float:
		"""
		Gets the time until the rate limit window resets for a given key.

		:param key: Unique identifier for the rate limit entry.
		:returns: Milliseconds until reset, or 0 if no window is currently open.
		"""
		last_reset = self._last_reset.get(key, 0)
		time_since_reset = _now_ms() - last_reset
		if time_since_reset >= self.interval:
			return 0
		return self.interval - time_since_reset

	async def reset(self, key: str) -> None:
		"""
		Clears the rate limit state for a given key.

		:param key: Unique identifier for the rate limit entry.
		"""
		await self.storage.delete(key)
		self._last_reset.pop(key, None)


def create_rate_limiter(
	max_requests: int = DEFAULT_MAX_REQUESTS,
	interval: int = DEFAULT_TIMEOUT,
	storage: RateLimitStorage | None = None,
) -> RateLimiter:
	"""Creates a new rate limiter instance with the specified configuration."""
	return RateLimiter(max_requests=max_requests, interval=interval, storage=storage)
