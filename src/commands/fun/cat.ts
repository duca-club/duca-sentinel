import { EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for cat.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "cat",
    description: "Display a random cat HTTP status code",
};

/**
 * Main handler for the /cat command.
 * Selects a random HTTP status code, fetches the corresponding http.cat image, and replies with an embed.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction }: SlashCommandProps): Promise<void> {
    try {
        // Defer to allow time for fetching image and building embed
        await interaction.deferReply();

        // — Define valid HTTP status codes for http.cat —
        const validStatusCodes = [
            100, 101, 102, 103, 200, 201, 202, 203, 204, 206, 207, 300, 301, 302, 303, 304, 305, 307, 308, 400, 401,
            402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 420, 421, 422, 423,
            424, 425, 426, 429, 431, 444, 450, 451, 497, 498, 499, 500, 501, 502, 503, 504, 506, 507, 508, 509, 510,
            511, 521, 522, 523, 525, 599,
        ];

        // — Select a random status code —
        let statusCode;
        statusCode = validStatusCodes[Math.floor(Math.random() * validStatusCodes.length)];

        // — Build embed with the http.cat image and color based on code range —
        const embed = new EmbedBuilder()
            .setTitle(`$ http ${statusCode}`)
            .setImage(`https://http.cat/${statusCode}`)
            .setColor(getColorForStatus(statusCode))
            .setFooter({ text: "via http.cat" });

        await interaction.editReply({ embeds: [embed] });
        logger("[/cat]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ cat")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/cat] " + String(error), "error", interaction.user.username);
    }
}

/**
 * Returns an embed color based on the HTTP status code range.
 * @param {number} code - The HTTP status code.
 * @returns {number} The hex color to use for the embed.
 */
function getColorForStatus(code: number): number {
    if (code >= 100 && code < 200) return 0x6495ed; // Blue
    if (code >= 200 && code < 300) return 0x2ecc71; // Green
    if (code >= 300 && code < 400) return 0xf1c40f; // Yellow
    if (code >= 400 && code < 500) return 0xe74c3c; // Red
    if (code >= 500) return 0x34495e; // Dark Blue/Gray
    return 0x7289da; // Discord blue as fallback
}
