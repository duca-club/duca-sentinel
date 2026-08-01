"""
Staging announcement media as real Discord uploads.

Passing an external URL to a media gallery makes Discord fetch it through its own image
proxy at send time. That resolution is best-effort: a large GIF on a host like Tenor often
comes back unresolved, and the message posts with a broken tile even though the API
accepted it and the URL is perfectly valid in a browser.

Downloading the bytes and attaching them removes the proxy from the path entirely, so what
the composer previewed is what lands in the channel. Anything too large to upload, or that
cannot be fetched, falls back to the plain URL rather than failing the announcement.
"""

import re
from dataclasses import replace
from io import BytesIO
from pathlib import PurePosixPath
from urllib.parse import urlparse

import aiohttp
import discord
from sentinel_render.payload import Announcement, Attachment

from duca_sentinel.lib.logger import Logger

#: Comfortably under Discord's 10 MiB limit for an unboosted guild, leaving room for the
#: rest of the payload.
MAX_UPLOAD_BYTES = 8 * 1024 * 1024

#: A slow host should not hold up the whole dispatch tick.
FETCH_TIMEOUT_SECONDS = 20

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")

_EXTENSION_BY_TYPE = {
	"image/gif": ".gif",
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
}


def _filename_for(url: str, content_type: str | None, index: int) -> str:
	"""Builds a filename Discord will accept, keeping the original where it is usable."""
	stem = PurePosixPath(urlparse(url).path).name
	stem = _SAFE_NAME.sub("_", stem).strip("_")

	extension = _EXTENSION_BY_TYPE.get((content_type or "").split(";")[0].strip().lower(), "")
	if extension and not stem.lower().endswith(extension):
		stem = f"{PurePosixPath(stem).stem or 'media'}{extension}"

	return stem or f"attachment_{index}{extension or '.png'}"


async def stage_attachments(
	announcement: Announcement,
) -> tuple[Announcement, list[discord.File]]:
	"""
	Downloads the announcement's media so it can be uploaded rather than hotlinked.

	:param announcement: The announcement about to be sent.
	:returns: The announcement with uploadable media rewritten to `attachment://` refs,
		and the files to send alongside it.
	"""
	if not announcement.attachments:
		return announcement, []

	staged: list[Attachment] = []
	files: list[discord.File] = []
	used_names: set[str] = set()

	timeout = aiohttp.ClientTimeout(total=FETCH_TIMEOUT_SECONDS)
	async with aiohttp.ClientSession(timeout=timeout) as session:
		for index, attachment in enumerate(announcement.attachments):
			try:
				async with session.get(attachment.url) as response:
					response.raise_for_status()

					declared = response.headers.get("Content-Length")
					if declared and int(declared) > MAX_UPLOAD_BYTES:
						raise ValueError(f"{int(declared) // 1024} KiB exceeds the upload limit")

					# Read in chunks rather than a single sized read: that returns only what
					# is currently buffered, which silently truncates a large file and
					# uploads a corrupt image Discord cannot decode.
					buffer = bytearray()
					async for chunk in response.content.iter_chunked(64 * 1024):
						buffer.extend(chunk)
						if len(buffer) > MAX_UPLOAD_BYTES:
							raise ValueError("larger than the upload limit")
					payload = bytes(buffer)

					if not payload:
						raise ValueError("response body was empty")

					name = _filename_for(attachment.url, response.headers.get("Content-Type"), index)

				# Discord matches attachment:// refs by filename, so duplicates would collide.
				while name in used_names:
					name = f"{index}_{name}"
				used_names.add(name)

				files.append(discord.File(BytesIO(payload), filename=name, description=attachment.alt))
				staged.append(replace(attachment, url=f"attachment://{name}"))

			except Exception as error:
				# Hotlinking still works often enough to be worth trying, and a broken tile
				# beats dropping the announcement.
				Logger.warn(f"[announcements] Could not stage {attachment.url}, falling back to the URL: {error}")
				staged.append(attachment)

	return replace(announcement, attachments=staged), files
