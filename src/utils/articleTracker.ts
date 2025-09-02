import logger from "./logger.js";

/**
 * Represents a posted article record.
 */
interface PostedArticle {
    url: string;
    title: string;
    postedAt: Date;
}

/**
 * Simple in-memory tracker for the last 10 posted articles to prevent duplicates.
 * Uses a rolling queue to maintain only the most recent articles.
 */
class ArticleTracker {
    /** Queue of the last 10 posted articles */
    private postedArticles: PostedArticle[] = [];
    /** Maximum number of articles to track */
    private readonly maxTrackedArticles = 10;

    /**
     * Checks if an article has already been posted in the last 10 articles.
     * @param {string} url - The article URL to check.
     * @returns {boolean} True if the article has been posted recently.
     */
    public hasBeenPosted(url: string): boolean {
        const cleanUrl = this.cleanUrl(url);
        return this.postedArticles.some(article => this.cleanUrl(article.url) === cleanUrl);
    }

    /**
     * Marks an article as posted and adds it to the tracking queue.
     * @param {string} url - The article URL.
     * @param {string} title - The article title.
     */
    public markAsPosted(url: string, title: string): void {
        const cleanUrl = this.cleanUrl(url);
        const now = new Date();

        // Add new article to the front of the queue
        this.postedArticles.unshift({
            url: cleanUrl,
            title: title,
            postedAt: now
        });

        // Keep only the last maxTrackedArticles
        if (this.postedArticles.length > this.maxTrackedArticles) {
            this.postedArticles = this.postedArticles.slice(0, this.maxTrackedArticles);
        }

        logger(`[articleTracker] Added article to tracking: ${title}`, "debug");
    }

    /**
     * Gets a list of articles that haven't been posted recently.
     * @param {Array<{link: string, title: string, pubDate: string}>} articles - Array of articles to filter.
     * @returns {Array<{link: string, title: string, pubDate: string}>} Array of articles that haven't been posted recently.
     */
    public filterNewArticles(articles: Array<{link: string, title: string, pubDate: string}>): Array<{link: string, title: string, pubDate: string}> {
        return articles.filter(article => !this.hasBeenPosted(article.link));
    }

    /**
     * Cleans a URL for consistent storage and comparison.
     * @param {string} url - The URL to clean.
     * @returns {string} The cleaned URL.
     */
    private cleanUrl(url: string): string {
        return url.trim().toLowerCase();
    }

    /**
     * Gets the number of articles currently tracked.
     * @returns {number} The number of tracked articles.
     */
    public get trackedCount(): number {
        return this.postedArticles.length;
    }

    /**
     * Gets a list of recently posted articles (for debugging).
     * @returns {Array<{title: string, postedAt: Date}>} Array of recent articles.
     */
    public getRecentArticles(): Array<{title: string, postedAt: Date}> {
        return this.postedArticles.map(article => ({
            title: article.title,
            postedAt: article.postedAt
        }));
    }
}

export default new ArticleTracker();
