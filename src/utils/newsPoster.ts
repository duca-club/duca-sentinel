import { Client, EmbedBuilder, TextChannel } from "discord.js";
import config from "../config/config.js";
import { fetchLatestNews, isCriticalNews } from "../lib/hnNews.js";
import logger from "./logger.js";

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

        // Fetch latest news
        const articles = await fetchLatestNews(3);
        if (articles.length === 0) {
            logger("[newsPoster] No articles to post", "warn");
            return;
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(isCritical ? "🚨 CRITICAL CYBER NEWS ALERT" : "📰 Latest Cyber News")
            .setColor(isCritical ? 0xff3333 : 0x00aeef)
            .setDescription(`Top ${articles.length} articles from The Hacker News`)
            .setFooter({ text: "The Hacker News" })
            .setTimestamp();

        // Add article fields
        articles.forEach((article, index) => {
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
        logger(`[newsPoster] Posted ${articles.length} articles${isCritical ? " (CRITICAL)" : ""}`, "success");
    } catch (error) {
        logger("[newsPoster] Error posting news: " + String(error), "error");
    }
} 