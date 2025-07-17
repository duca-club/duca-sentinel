import { Client } from "discord.js";
import cron from "node-cron";
import config from "../config/config.js";
import { postNews } from "./newsPoster.js";
import { fetchLatestNews, isCriticalNews } from "../lib/hnNews.js";
import logger from "./logger.js";

/**
 * Stores the URL of the last posted article to avoid duplicates.
 */
let lastPostedArticleUrl: string = "";

/**
 * Initialises the news scheduler with scheduled posts and critical news monitoring.
 * @param {Client} client - The Discord client instance.
 */
export function initialiseNewsScheduler(client: Client): void {
    // Check if news is enabled
    if (!config.NEWS_ENABLED) {
        logger("[newsScheduler] News scheduler disabled - missing channel ID", "warn");
        return;
    }

    // Schedule regular posts at 9 AM and 5 PM
    cron.schedule("0 9 * * *", () => {
        logger("[newsScheduler] Running scheduled 9 AM news post", "info");
        postNews(client, false);
    }, { timezone: "Australia/Melbourne" });

    cron.schedule("0 17 * * *", () => {
        logger("[newsScheduler] Running scheduled 5 PM news post", "info");
        postNews(client, false);
    }, { timezone: "Australia/Melbourne" });

    // Monitor for critical news every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        try {
            const articles = await fetchLatestNews(1);
            if (articles.length > 0) {
                const latestArticle = articles[0];
                
                // Check if this is a new article and if it's critical
                if (latestArticle.link !== lastPostedArticleUrl && isCriticalNews(latestArticle)) {
                    logger("[newsScheduler] Critical news detected, posting immediately", "info");
                    await postNews(client, true);
                    lastPostedArticleUrl = latestArticle.link;
                }
            }
        } catch (error) {
            logger("[newsScheduler] Error in critical news check: " + String(error), "error");
        }
    });

    logger("[newsScheduler] News scheduler initialised successfully", "success");
} 