import { Client, EmbedBuilder, TextChannel } from "discord.js";
import config from "../config/config.js";
import { fetchLatestNews, isCriticalNews } from "../lib/hnNews.js";
import logger from "./logger.js";
import articleTracker from "./articleTracker.js";

/**
 * Posts the latest news articles to the configured Discord channel.
 * @param {Client} client - The Discord client instance.
 * @param {boolean} isCritical - Whether this is a critical news alert.
 * @returns {Promise<void>}
 */
export async function postNews(client: Client, isCritical: boolean = false): Promise<void> {
    try {
        // Check if news is enabled
        if (!config.NEWS_ENABLED || !config.NEWS_CHANNEL_ID) {
            logger("[newsPoster] News posting disabled - missing channel ID", "warn");
            return;
        }

        // Get the channel
        const channel = client.channels.cache.get(config.NEWS_CHANNEL_ID) as TextChannel;
        if (!channel) {
            logger("[newsPoster] News channel not found", "error");
            return;
        }

        // Fetch a large batch of articles to find enough new ones
        const targetCount = isCritical ? 1 : 3;
        const fetchCount = Math.max(targetCount * 5, 25); // Fetch 5x what we need, minimum 25
        
        const articles = await fetchLatestNews(fetchCount);
        if (articles.length === 0) {
            logger("[newsPoster] No articles to post", "warn");
            return;
        }

        // Filter out articles that have been posted recently
        const newArticles = articleTracker.filterNewArticles(articles);
        
        if (newArticles.length === 0) {
            logger("[newsPoster] All fetched articles have been posted recently - RSS feed may be stale", "info");
            return;
        }

        // Take only the number of articles we want to post
        const articlesToPost = newArticles.slice(0, targetCount);

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(isCritical ? "🚨 CRITICAL CYBER NEWS ALERT" : "📰 Latest Cyber News")
            .setColor(isCritical ? 0xff3333 : 0x00aeef)
            .setDescription(isCritical ? "Critical article from The Hacker News" : `Top ${articlesToPost.length} articles from The Hacker News`)
            .setFooter({ text: "The Hacker News" })
            .setTimestamp();

        // Add article fields
        articlesToPost.forEach((article, index) => {
            const isCriticalArticle = isCriticalNews(article);
            const prefix = isCriticalArticle ? "🚨 " : "";
            
            embed.addFields({
                name: `${index + 1}. ${prefix}${article.title}`,
                value: `[Read More](${article.link}) • <t:${Math.floor(new Date(article.pubDate).getTime() / 1000)}:R>`,
                inline: false
            });
        });

        // Post to channel
        await channel.send({ embeds: [embed] });
        
        // Mark all posted articles as tracked
        articlesToPost.forEach(article => {
            articleTracker.markAsPosted(article.link, article.title);
        });
        
        logger(`[newsPoster] Posted ${articlesToPost.length} articles${isCritical ? " (CRITICAL)" : ""}`, "success");
    } catch (error) {
        logger("[newsPoster] Error posting news: " + String(error), "error");
    }
} 