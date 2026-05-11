import { task } from "@commandkit/tasks";
import { Logger } from "commandkit/logger";
import envConfig from "../../lib/envConfig.ts";
import { claimPosted, unclaimPosted } from "../../lib/news/newsDedupe.ts";
import { buildNewsDigestContainer } from "../../lib/news/newsEmbed.tsx";
import { isNewsPostingEnabled } from "../../lib/news/newsGate.ts";
import { postNewsWithDiscussionThread } from "../../lib/news/newsPost.ts";
import { fetchNewsFeed, type RSSArticle, stableArticleKey } from "../../lib/news/newsRSS.ts";

export default task({
	name: "news-digest",
	schedule: envConfig.NEWS_DIGEST_CRON,
	timezone: envConfig.NEWS_TIMEZONE,
	async prepare() {
		return await isNewsPostingEnabled();
	},
	async execute(ctx) {
		const feedURL = envConfig.NEWS_FEED_URL;
		const articles = await fetchNewsFeed(feedURL);
		if (articles.length === 0) {
			Logger.warn("[news/Digest] Empty feed");
			return;
		}
		const picked: RSSArticle[] = [];

		for (const article of articles) {
			const key = stableArticleKey(article);
			const claimed = await claimPosted(key, "digest");
			if (claimed) {
				picked.push(article);
				if (picked.length >= 3) {
					break;
				}
			}
		}

		if (picked.length === 0) {
			Logger.info("[news/Digest] No unseen articles found");
			return;
		}

		const container = buildNewsDigestContainer(picked);
		try {
			await postNewsWithDiscussionThread(ctx.client, container, "digest");
		} catch (error) {
			await Promise.all(picked.map((a) => unclaimPosted(stableArticleKey(a))));
			Logger.error(`[news/Digest] Failed to post ${String(picked.length)} article(s): ${String(error)}`);
			return;
		}

		Logger.info(`[news/Digest] Posted ${String(picked.length)} article(s)`);
	},
});
