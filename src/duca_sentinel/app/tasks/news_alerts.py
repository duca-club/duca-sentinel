from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.news.news_dedupe import claim_posted, unclaim_posted
from duca_sentinel.lib.news.news_embed import build_news_critical_alert_container
from duca_sentinel.lib.news.news_gate import is_news_posting_enabled
from duca_sentinel.lib.news.news_post import post_news_with_discussion_thread
from duca_sentinel.lib.news.news_rss import (
	article_matches_alert_keywords,
	fetch_news_feed,
	is_article_new_for_alert,
	stable_article_key,
)
from duca_sentinel.lib.tasks import TaskContext, task

NEWS_ALERTS_CRON_TIMEZONE = "Asia/Kolkata"


async def _prepare() -> bool:
	return await is_news_posting_enabled()


async def _execute(ctx: TaskContext) -> None:
	feed_url = env_config.NEWS_FEED_URL
	alert_keywords = env_config.NEWS_ALERT_KEYWORDS.split(",")

	articles = await fetch_news_feed(feed_url)
	newest_matching = next(
		(
			article
			for article in articles
			if is_article_new_for_alert(article) and article_matches_alert_keywords(article, alert_keywords)
		),
		None,
	)

	if newest_matching is None:
		return

	key = stable_article_key(newest_matching)
	claimed = await claim_posted(key, "alert")
	if not claimed:
		return

	container = build_news_critical_alert_container(newest_matching)
	try:
		await post_news_with_discussion_thread(ctx.client, container, "alert")
	except Exception as error:
		await unclaim_posted(key)
		Logger.error(f"[news/Alert] Failed to post {newest_matching.title}: {error}")
		return

	Logger.info(f"[news/Alert] Posted {newest_matching.title}")


task(
	name="news-alerts",
	schedule=env_config.NEWS_ALERT_CRON,
	timezone=NEWS_ALERTS_CRON_TIMEZONE,
	prepare=_prepare,
	execute=_execute,
)
