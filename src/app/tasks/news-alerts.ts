import { task } from "@commandkit/tasks";
import { Logger } from "commandkit/logger";
import envConfig from "../../lib/envConfig.ts";
import { claimPosted, unclaimPosted } from "../../lib/news/newsDedupe.ts";
import { buildNewsCriticalAlertContainer } from "../../lib/news/newsEmbed.tsx";
import { isNewsPostingEnabled } from "../../lib/news/newsGate.ts";
import { postNewsWithDiscussionThread } from "../../lib/news/newsPost.ts";
import {
	articleMatchesAlertKeywords,
	fetchNewsFeed,
	isArticleNewForAlert,
	stableArticleKey,
} from "../../lib/news/newsRSS.ts";

const NEWS_ALERTS_CRON_TIMEZONE = "Asia/Kolkata";

export default task({
	name: "news-alerts",
	schedule: envConfig.NEWS_ALERT_CRON,
	timezone: NEWS_ALERTS_CRON_TIMEZONE,
	async prepare() {
		return await isNewsPostingEnabled();
	},
	async execute(ctx) {
		const feedURL = envConfig.NEWS_FEED_URL;
		const alertKeywords = envConfig.NEWS_ALERT_KEYWORDS.split(",");

		const articles = await fetchNewsFeed(feedURL);
		const newestMatching = articles.find(
			(article) => isArticleNewForAlert(article) && articleMatchesAlertKeywords(article, alertKeywords),
		);

		if (newestMatching === undefined) {
			return;
		}

		const key = stableArticleKey(newestMatching);
		const claimed = await claimPosted(key, "alert");
		if (!claimed) {
			return;
		}

		const container = buildNewsCriticalAlertContainer(newestMatching);
		try {
			await postNewsWithDiscussionThread(ctx.client, container, "alert");
		} catch (error) {
			await unclaimPosted(key);
			Logger.error(`[news/Alert] Failed to post ${newestMatching.title}: ${String(error)}`);
			return;
		}

		Logger.info(`[news/Alert] Posted ${newestMatching.title}`);
	},
});
