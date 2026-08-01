"""
Application logger.

Exposes the same small surface the bot used under CommandKit (`log`, `info`, `warn`,
`error`) so call sites stay uniform, while delegating to the standard library
`logging` module underneath.
"""

import logging
import sys

LOGGER_NAME = "duca-sentinel"
LOG_FORMAT = "%(asctime)s %(levelname)-5s %(message)s"
LOG_DATE_FORMAT = "%H:%M:%S"

_logger = logging.getLogger(LOGGER_NAME)


def configure_logging(level: int = logging.INFO) -> None:
	"""
	Installs the root logging configuration. Called once at startup, before the bot connects.

	:param level: Minimum level to emit.
	"""
	handler = logging.StreamHandler(sys.stdout)
	handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))

	root = logging.getLogger()
	root.handlers.clear()
	root.addHandler(handler)
	root.setLevel(level)

	# discord.py logs every gateway heartbeat at DEBUG; keep it at INFO regardless of our level.
	logging.getLogger("discord").setLevel(max(level, logging.INFO))


class Logger:
	"""Namespace of module-level logging helpers."""

	@staticmethod
	def log(message: str) -> None:
		_logger.info(message)

	@staticmethod
	def info(message: str) -> None:
		_logger.info(message)

	@staticmethod
	def warn(message: str) -> None:
		_logger.warning(message)

	@staticmethod
	def error(message: str) -> None:
		_logger.error(message)
