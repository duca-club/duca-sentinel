import Parser from "rss-parser";

export interface RSSArticle {
	guid: string;
	imageURL: string | null;
	link: string;
	pubDateMs: number;
	title: string;
}

/**
 * Alerts ignore articles older than 1 day before process start
 */
const ALERT_PROCESS_ANCHOR_MS = Date.now();
const ALERT_RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const ALERT_MIN_PUB_DATE_MS = ALERT_PROCESS_ANCHOR_MS - ALERT_RECENCY_WINDOW_MS;

export function isArticleNewForAlert(article: RSSArticle): boolean {
	if (article.pubDateMs <= 0) {
		return false;
	}
	return article.pubDateMs >= ALERT_MIN_PUB_DATE_MS;
}

function parseItemPubDateToEpochMs(rssItem: Parser.Item): number {
	if (rssItem.isoDate) {
		return new Date(rssItem.isoDate).getTime();
	}
	if (rssItem.pubDate) {
		return new Date(rssItem.pubDate).getTime();
	}
	return 0;
}

const IMG_SRC_RE = /<img[^>]+src=["']([^"']+)["']/i;

function extractImageURL(content: string | undefined, enclosure: Parser.Enclosure | undefined): string | null {
	if (enclosure?.url) {
		const enclosureMimeType = enclosure.type?.toLowerCase() ?? "";
		if (enclosureMimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(enclosure.url)) {
			return enclosure.url;
		}
	}
	if (!content) {
		return null;
	}
	const firstImgTagMatch = content.match(IMG_SRC_RE);
	return firstImgTagMatch?.[1] ?? null;
}

function mapFeedItemToArticle(rssItem: Parser.Item): RSSArticle | null {
	const link = rssItem.link?.trim();
	const title = rssItem.title?.trim();
	if (!link || !title) {
		return null;
	}
	const guid = rssItem.guid?.trim() || link;

	return {
		title,
		link,
		guid,
		pubDateMs: parseItemPubDateToEpochMs(rssItem),
		imageURL: extractImageURL(rssItem.content, rssItem.enclosure),
	};
}

export function stableArticleKey(article: { guid: string; link: string }): string {
	const raw = article.guid.trim() || article.link.trim();
	if (!raw) {
		throw new Error("RSS article missing stable key");
	}
	return raw;
}

export async function fetchNewsFeed(feedUrl: string): Promise<RSSArticle[]> {
	const parser = new Parser();
	const feed = await parser.parseURL(feedUrl);
	const parsedArticles = feed.items.map(mapFeedItemToArticle).filter((x): x is RSSArticle => x !== null);
	parsedArticles.sort((a, b) => b.pubDateMs - a.pubDateMs);
	return parsedArticles;
}

export function articleMatchesAlertKeywords(article: RSSArticle, keywords: readonly string[]): boolean {
	const titleLower = article.title.toLowerCase();
	return keywords.some((keyword) => titleLower.includes(keyword.toLowerCase()));
}
