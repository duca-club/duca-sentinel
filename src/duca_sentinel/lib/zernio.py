"""
Publishing to Instagram and LinkedIn through Zernio.

Zernio exists in this stack for one reason: neither platform lets a student club publish
programmatically on its own. Instagram wants a Meta app review; LinkedIn wants partner
approval to post as an organisation. Zernio holds both approvals, so DUCA connects its
accounts to Zernio and this module talks to Zernio instead.

Only the small part of that API this bot needs lives here. Zernio can also schedule, but
the schedule stays in Supabase: two systems owning the same "when" would mean every edit
and cancellation had to be replayed against a third party, and the queue already survives
a restart. Posts are sent with `publishNow` at the minute the bot claims them.
"""

from typing import Any

import aiohttp

from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger

BASE_URL = "https://zernio.com/api/v1"

#: Long enough for Zernio to accept a post with several media URLs it has to fetch, short
#: enough that a hung request cannot hold the scheduler tick open.
TIMEOUT = aiohttp.ClientTimeout(total=45)

#: Zernio's own post states. `partial` means some platforms in the request succeeded and
#: others did not - impossible here, since every post is sent to exactly one account, but
#: it is treated as a failure rather than left to fall between the two branches.
TERMINAL_OK = {"published"}
TERMINAL_BAD = {"failed", "partial", "cancelled"}


class ZernioError(RuntimeError):
	"""Raised when Zernio refuses a request. The message is safe to store and show."""


def configured() -> bool:
	"""Whether a key is present at all. Absent is a normal state, not a broken one."""
	return bool(env_config.ZERNIO_API_KEY)


async def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
	if not configured():
		raise ZernioError("No Zernio API key is configured")

	headers = {"Authorization": f"Bearer {env_config.ZERNIO_API_KEY}"}
	async with (
		aiohttp.ClientSession(timeout=TIMEOUT) as session,
		session.request(method, f"{BASE_URL}{path}", headers=headers, json=payload) as response,
	):
		body = await response.json(content_type=None)
		if response.status >= 400:
			# Zernio returns a human-readable `error` alongside a machine `type`. The
			# message is what ends up in front of whoever has to fix the post, so it is
			# worth more here than the status code.
			detail = (body or {}).get("error") or f"HTTP {response.status}"
			raise ZernioError(detail)
		return body or {}


async def list_accounts() -> list[dict[str, Any]]:
	"""Every social account connected to the Zernio workspace."""
	response = await _request("GET", "/accounts")
	return response.get("accounts") or []


async def account_for(platform: str) -> dict[str, Any] | None:
	"""
	The connected account to publish `platform` posts through.

	Resolved at run time rather than configured, so linking an account is the only step -
	nobody has to come back and paste an id into the environment afterwards. The override
	exists for the case that breaks that: two accounts on the same platform, where picking
	the first one would be a coin toss.
	"""
	override = env_config.ZERNIO_ACCOUNT_OVERRIDES.get(platform)
	accounts = [a for a in await list_accounts() if a.get("platform") == platform]

	if override:
		return next((a for a in accounts if a.get("_id") == override), None)

	if len(accounts) > 1:
		Logger.warn(
			f"[zernio] {len(accounts)} {platform} accounts are connected; "
			f"set ZERNIO_{platform.upper()}_ACCOUNT_ID to choose one"
		)
		return None

	return accounts[0] if accounts else None


async def linkedin_organizations(account_id: str) -> list[dict[str, Any]]:
	"""Company pages the connected LinkedIn member administers."""
	response = await _request("GET", f"/accounts/{account_id}/linkedin-organizations")
	return response.get("organizations") or response.get("data") or []


def build_payload(row: dict[str, Any], account_id: str, organization_urn: str | None) -> dict[str, Any]:
	"""
	Turns a `social_posts` row into a Zernio create-post body.

	`publishNow` rather than `scheduledFor`: the row is only built once it is already due,
	and handing Zernio a time as well would put the schedule in two places.
	"""
	platform = row["platform"]
	specific: dict[str, Any] = {}

	if row.get("first_comment"):
		# Both platforms take the first comment the same way, for different reasons: on
		# Instagram a caption cannot hold a clickable link, and on LinkedIn a post that
		# contains one gets suppressed.
		specific["firstComment"] = row["first_comment"]

	if platform == "linkedin" and organization_urn:
		# Without this the post goes out under the personal profile of whoever linked the
		# account, silently. That is the worst failure this integration has, so the caller
		# refuses to publish rather than guess.
		specific["organizationUrn"] = organization_urn

	target: dict[str, Any] = {"platform": platform, "accountId": account_id}
	if specific:
		target["platformSpecificData"] = specific

	payload: dict[str, Any] = {
		"content": row["caption"],
		"platforms": [target],
		"publishNow": True,
	}

	media = [{"type": "image", "url": item["url"]} for item in row.get("media") or [] if item.get("url")]
	if media:
		payload["mediaItems"] = media

	return payload


async def publish(payload: dict[str, Any]) -> dict[str, Any]:
	"""Creates the post. Returns Zernio's post object, which may still be `publishing`."""
	response = await _request("POST", "/posts", payload)
	post = response.get("post") or {}
	if not post.get("_id"):
		raise ZernioError("Zernio accepted the post but returned no id")
	return post


async def get_post(post_id: str) -> dict[str, Any]:
	"""Reads a post back, for the live URL once it has actually gone out."""
	response = await _request("GET", f"/posts/{post_id}")
	return response.get("post") or {}


def live_url(post: dict[str, Any]) -> str | None:
	"""The link to the published post, once Zernio knows it."""
	for entry in post.get("platforms") or []:
		url = entry.get("platformPostUrl")
		if url:
			return url
	return None


def failure_reason(post: dict[str, Any]) -> str:
	"""Why a post did not go out, in words worth storing."""
	for entry in post.get("platforms") or []:
		message = entry.get("error") or entry.get("errorMessage")
		if message:
			return str(message)
	return post.get("error") or f"Zernio reported status '{post.get('status')}'"
