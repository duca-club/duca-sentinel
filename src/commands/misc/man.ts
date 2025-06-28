import { EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for man.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "man",
    description: "Display a list of all available commands",
};

/**
 * Main handler for the /man command.
 * Builds an embed listing active commands and replies to the user.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction, client }: SlashCommandProps): Promise<void> {
    try {
        await interaction.deferReply();

        // — Retrieve bot avatar URL for thumbnail —
        const avatarUrl = client.user?.avatarURL() ?? undefined;

        // — Build the commands list embed —
        const embed = new EmbedBuilder()
            .setTitle("$ man duca-sentinel")
            .setDescription(
                "**DUCA Sentinel Commands Manual**\n Below is a complete list of all slash commands for DUCA Sentinel seperated by category:",
            )
            .addFields(
                // Entertainment
                { name: "/usr/bin/lol", value: "`8ball` `cat` `flip`" },
                // Utility
                { name: "/core/utils", value: "`calendar` `ping` `verify`" },
                // Misc
                { name: "/etc/extra", value: "`man` `whoami`" },
            )
            .setColor(0x00aeef);

        // Append thumbnail if available
        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        await interaction.editReply({ embeds: [embed] });
        logger("[/man]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ man duca-sentinel")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/man] " + String(error), "error", interaction.user.username);
    }
}
