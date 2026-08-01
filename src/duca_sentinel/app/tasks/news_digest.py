from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.news.news_dedupe import claim_posted, unclaim_posted
from duca_sentinel.lib.news.news_embed import build_news_digest_container
from duca_sentinel.lib.news.news_gate import is_news_posting_enabled
from duca_sentinel.lib.news.news_post import post_news_with_discussion_thread
from duca_sentinel.lib.news.news_rss import RSSArticle, fetch_news_feed, stable_article_key
from duca_sentinel.lib.tasks import TaskContext, task

MAX_DIGEST_ARTICLES = 3


async def _prepare() -> bool:
	return await is_news_posting_enabled()


async def _execute(ctx: TaskContext) -> None:
	feed_url = env_config.NEWS_FEED_URL
	articles = await fetch_news_feed(feed_url)
	if len(articles) == 0:
		Logger.warn("[news/Digest] Empty feed")
		return

	picked: list[RSSArticle] = []

	for article in articles:
		key = stable_article_key(article)
		claimed = await claim_posted(key, "digest")
		if claimed:
			picked.append(article)
			if len(picked) >= MAX_DIGEST_ARTICLES:
				break

	if len(picked) == 0:
		Logger.info("[news/Digest] No unseen articles found")
		return

	container = build_news_digest_container(picked)
	try:
		await post_news_with_discussion_thread(ctx.client, container, "digest")
	except Exception as error:
		for article in picked:
			await unclaim_posted(stable_article_key(article))
		Logger.error(f"[news/Digest] Failed to post {len(picked)} article(s): {error}")
		return

	Logger.info(f"[news/Digest] Posted {len(picked)} article(s)")


task(
	name="news-digest",
	schedule=env_config.NEWS_DIGEST_CRON,
	timezone=env_config.NEWS_TIMEZONE,
	prepare=_prepare,
	execute=_execute,
)
