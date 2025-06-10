import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for 8ball.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "8ball",
    description: "Ask the magic 8-ball a question",
    options: [
        {
            name: "question",
            description: "Your query",
            type: ApplicationCommandOptionType.String,
            min_length: 10,
            max_length: 250,
            required: true,
        },
    ],
};

/**
 * Main handler for the /8ball command.
 * Format's the user's question, fetches a reading from an external API and replies with an embed.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction }: SlashCommandProps): Promise<void> {
    try {
        // Defer reply to allow time for the API call
        await interaction.deferReply();

        const question = interaction.options.getString("question")!;

        // — Query Formatting —
        // Replace whitespace for URL encoding
        const queryQuestion = question.replace(/\s+/g, "+").trim();

        // Prepare a clean display version of the question
        let displayQuestion = question.replace(/\s+/g, " ").trim();
        if (!displayQuestion.endsWith("?")) {
            displayQuestion += "?";
        }

        // — Fetch Reading —
        const response = await fetch(`https://eightballapi.com/api/biased?question=${queryQuestion}&locale=en`);
        const { reading } = (await response.json()) as { reading: string };

        const embed = new EmbedBuilder()
            .setTitle(`$ 8-ball "${displayQuestion}"`)
            .setDescription(reading)
            .setColor(0x00aeef)
            .setFooter({ text: "via eightballapi.com" });

        await interaction.editReply({ embeds: [embed] });
        logger("[/8ball]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ 8-ball")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/8ball] " + String(error), "error", interaction.user.username);
    }
}
