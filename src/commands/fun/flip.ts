import { EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for flip.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "flip",
    description: "Flip a virtual coin!",
};

/**
 * Main handler for the /flip command.
 * Generates a random coin flip result, and replies with an embed.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction }: SlashCommandProps): Promise<void> {
    try {
        // Defer to allow time for generating result and building embed
        await interaction.deferReply();

        // — Generate random coin flip outcome —
        const randomNumber = Math.random();
        const result = randomNumber < 0.5 ? "heads" : "tails";

        const embed = new EmbedBuilder()
            .setTitle("$ flip")
            .setDescription(`\\> output :: **${result}**`)
            .setColor(0x00aeef);

        await interaction.editReply({ embeds: [embed] });
        logger("[/flip]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ flip")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/flip] " + String(error), "error", interaction.user.username);
    }
}
