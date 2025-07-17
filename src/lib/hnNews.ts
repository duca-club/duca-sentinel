import Parser from "rss-parser";
import logger from "../utils/logger.js";

/**
 * Represents a news article from The Hacker News.
 */
interface NewsArticle {
    title: string;
    link: string;
    pubDate: string;
    content?: string;
}

/**
 * RSS parser instance for fetching news.
 */
const parser = new Parser();

/**
 * Fetches the latest articles from The Hacker News RSS feed.
 * @param {number} count - Number of articles to fetch (default: 3).
 * @returns {Promise<NewsArticle[]>} Array of news articles.
 */
export async function fetchLatestNews(count: number = 3): Promise<NewsArticle[]> {
    try {
        const feed = await parser.parseURL("https://feeds.feedburner.com/TheHackersNews");
        
        if (!feed.items || feed.items.length === 0) {
            logger("[hnNews] No articles found in RSS feed", "warn");
            return [];
        }

        // Take the latest articles and map to our interface
        const articles: NewsArticle[] = feed.items
            .slice(0, count)
            .map(item => ({
                title: item.title || "No Title",
                link: item.link || "",
                pubDate: item.pubDate || new Date().toISOString(),
                content: item.content
            }));

        logger(`[hnNews] Fetched ${articles.length} articles`, "info");
        return articles;
    } catch (error) {
        logger("[hnNews] Error fetching news: " + String(error), "error");
        return [];
    }
}

/**
 * Checks if an article contains critical keywords.
 * @param {NewsArticle} article - The article to check.
 * @returns {boolean} True if the article contains critical keywords.
 */
export function isCriticalNews(article: NewsArticle): boolean {
    const criticalKeywords = [
        "critical", "zero-day"
    ];

    const title = article.title.toLowerCase();
    return criticalKeywords.some(keyword => title.includes(keyword.toLowerCase()));
} 