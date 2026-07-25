"""
Feature flag primitives.

A flag pairs a key with a `decide` function. Evaluating the flag looks its configuration up
through the globally registered provider and hands that configuration to `decide`, which returns
the final boolean. Flags therefore stay declarative and the lookup backend stays swappable.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class FlagConfiguration:
	"""A flag's stored configuration, as returned by a provider."""

	enabled: bool


class FlagProvider(Protocol):
	"""Source of truth for flag configurations."""

	async def get_flag(self, key: str) -> FlagConfiguration | None: ...

	async def has_flag(self, key: str) -> bool: ...


_flag_provider: FlagProvider | None = None


def set_flag_provider(provider: FlagProvider) -> None:
	"""Registers the provider used to resolve every flag."""
	global _flag_provider
	_flag_provider = provider


def get_flag_provider() -> FlagProvider | None:
	"""Returns the currently registered flag provider, or None if one was never set."""
	return _flag_provider


def flag(
	key: str,
	description: str,
	decide: Callable[[FlagConfiguration | None], bool],
) -> Callable[[], Awaitable[bool]]:
	"""
	Defines a feature flag.

	:param key: Identifier the provider stores this flag under.
	:param description: Human-readable explanation of what the flag controls.
	:param decide: Maps the fetched configuration (None when unavailable) to a boolean.
	:returns: An awaitable callable that evaluates the flag.
	"""

	async def evaluate() -> bool:
		provider = get_flag_provider()
		configuration = await provider.get_flag(key) if provider is not None else None
		return decide(configuration)

	evaluate.key = key  # type: ignore[attr-defined]
	evaluate.description = description  # type: ignore[attr-defined]
	return evaluate
