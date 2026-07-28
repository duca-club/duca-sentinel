import discord
from discord import ui

from duca_sentinel.lib import emojis
from duca_sentinel.lib.news.news_rss import RSSArticle

#: discord.js `Colors.Red`, kept as a literal so the alert accent matches the previous build.
CRITICAL_ALERT_COLOUR = 0xED4245


def _format_published_timestamp_line(pub_date_ms: int) -> str | None:
	"""Discord `<t:unix:style>`; seconds from `pub_date_ms`."""
	if pub_date_ms <= 0:
		return None
	unix_seconds = pub_date_ms // 1000
	return f"-# Published <t:{unix_seconds}:R>"


def _build_article_blocks(article: RSSArticle) -> list[ui.Item]:
	blocks: list[ui.Item] = []

	if article.image_url:
		blocks.append(ui.MediaGallery(discord.MediaGalleryItem(article.image_url)))

	title = f"**{article.title.strip()}**"
	published = _format_published_timestamp_line(article.pub_date_ms)
	section_body = f"{title}\n{published}" if published is not None else title

	blocks.append(
		ui.Section(
			ui.TextDisplay(section_body),
			accessory=ui.Button(label="Read More", style=discord.ButtonStyle.link, url=article.link),
		)
	)
	blocks.append(ui.Separator(visible=True, spacing=discord.SeparatorSpacing.small))

	return blocks


def _build_digest_article_blocks(articles: list[RSSArticle]) -> list[ui.Item]:
	blocks: list[ui.Item] = []

	for article in articles:
		blocks.extend(_build_article_blocks(article))

	return blocks


def _feed_attribution() -> str:
	return f"-# via [The Hacker News](https://thehackernews.com) {emojis.get(emojis.RSS_SIMPLE)}"


def build_news_digest_container(articles: list[RSSArticle]) -> ui.Container:
	return ui.Container(
		ui.TextDisplay(f"### {emojis.get(emojis.NEWSPAPER)} Latest Cyber News"),
		ui.Separator(visible=True, spacing=discord.SeparatorSpacing.small),
		*_build_digest_article_blocks(articles),
		ui.TextDisplay(_feed_attribution()),
		accent_colour=0x006DD4,
	)


def build_news_critical_alert_container(article: RSSArticle) -> ui.Container:
	return ui.Container(
		ui.TextDisplay(f"### {emojis.get(emojis.WARNING_CIRCLE)} Critical Security Alert"),
		ui.Separator(visible=True, spacing=discord.SeparatorSpacing.small),
		*_build_article_blocks(article),
		ui.TextDisplay(_feed_attribution()),
		accent_colour=CRITICAL_ALERT_COLOUR,
	)
