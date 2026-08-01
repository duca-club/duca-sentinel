import asyncio
import calendar
import re
import time
from dataclasses import dataclass
from typing import Any

import feedparser


@dataclass(frozen=True)
class RSSArticle:
	guid: str
	image_url: str | None
	link: str
	pub_date_ms: int
	title: str


# Alerts ignore articles older than 1 day before process start
ALERT_PROCESS_ANCHOR_MS = time.time() * 1000
ALERT_RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000
ALERT_MIN_PUB_DATE_MS = ALERT_PROCESS_ANCHOR_MS - ALERT_RECENCY_WINDOW_MS


def is_article_new_for_alert(article: RSSArticle) -> bool:
	if article.pub_date_ms <= 0:
		return False
	return article.pub_date_ms >= ALERT_MIN_PUB_DATE_MS


def _parse_item_pub_date_to_epoch_ms(rss_item: Any) -> int:
	"""
	feedparser normalises `pubDate`/`dc:date` into a UTC `struct_time`, so `timegm` (not `mktime`,
	which assumes local time) is what converts it back to an epoch without shifting the value.
	"""
	published = rss_item.get("published_parsed") or rss_item.get("updated_parsed")
	if published is None:
		return 0
	return calendar.timegm(published) * 1000


IMG_SRC_RE = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.IGNORECASE)
IMAGE_EXTENSION_RE = re.compile(r"\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)", re.IGNORECASE)


def _extract_image_url(content: str | None, enclosure: dict[str, Any] | None) -> str | None:
	if enclosure and enclosure.get("href"):
		enclosure_url = enclosure["href"]
		enclosure_mime_type = (enclosure.get("type") or "").lower()
		if enclosure_mime_type.startswith("image/") or IMAGE_EXTENSION_RE.search(enclosure_url):
			return enclosure_url
	if not content:
		return None
	first_img_tag_match = IMG_SRC_RE.search(content)
	return first_img_tag_match.group(1) if first_img_tag_match else None


def _extract_item_content(rss_item: Any) -> str | None:
	"""Prefers `content:encoded` and falls back to the item description, whichever the feed sets."""
	content_entries = rss_item.get("content")
	if content_entries:
		return content_entries[0].get("value")
	return rss_item.get("summary")


def _extract_item_enclosure(rss_item: Any) -> dict[str, Any] | None:
	enclosures = rss_item.get("enclosures")
	return enclosures[0] if enclosures else None


def _map_feed_item_to_article(rss_item: Any) -> RSSArticle | None:
	link = (rss_item.get("link") or "").strip()
	title = (rss_item.get("title") or "").strip()
	if not link or not title:
		return None
	guid = (rss_item.get("id") or "").strip() or link

	return RSSArticle(
		title=title,
		link=link,
		guid=guid,
		pub_date_ms=_parse_item_pub_date_to_epoch_ms(rss_item),
		image_url=_extract_image_url(_extract_item_content(rss_item), _extract_item_enclosure(rss_item)),
	)


def stable_article_key(article: RSSArticle) -> str:
	raw = article.guid.strip() or article.link.strip()
	if not raw:
		raise ValueError("RSS article missing stable key")
	return raw


async def fetch_news_feed(feed_url: str) -> list[RSSArticle]:
	# feedparser fetches and parses synchronously, so run it off the event loop.
	feed = await asyncio.to_thread(feedparser.parse, feed_url)
	parsed_articles = [article for article in map(_map_feed_item_to_article, feed.entries) if article is not None]
	parsed_articles.sort(key=lambda article: article.pub_date_ms, reverse=True)
	return parsed_articles


def article_matches_alert_keywords(article: RSSArticle, keywords: list[str]) -> bool:
	title_lower = article.title.lower()
	return any(keyword.lower() in title_lower for keyword in keywords)
