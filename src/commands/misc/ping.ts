import { EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for ping.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "ping",
    description: "Display latency and response time",
};

/**
 * Main handler for the /ping command.
 * Measures round-trip latency and websocket heartbeat, and replies with an embed.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction, client }: SlashCommandProps): Promise<void> {
    try {
        await interaction.deferReply();

        // — Measure round-trip latency —
        const reply = await interaction.fetchReply();
        const ping = reply.createdTimestamp - interaction.createdTimestamp;

        const pong = new EmbedBuilder()
            .setTitle("$ ping")
            .addFields(
                { name: "latency(rtt)", value: `\`${ping}ms\``, inline: true },
                { name: "socket.heartbeat", value: `\`${client.ws.ping}ms\``, inline: true },
            )
            .setColor(0x00aeef);

        await interaction.editReply({ embeds: [pong] });
        logger("[/ping]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ ping")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/ping] " + String(error), "error", interaction.user.username);
    }
}
