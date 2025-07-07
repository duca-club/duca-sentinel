import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ButtonKit, type CommandData, type SlashCommandProps } from "commandkit";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for whoami.
 *
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "whoami",
    description: "Display about me",
};

/**
 * Main handler for the /whoami command.
 * Calculates uptime and memory usage, builds an embed with bot info, and adds action buttons.
 *
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction, client }: SlashCommandProps): Promise<void> {
    try {
        await interaction.deferReply();

        // — Calculate process uptime (days, hours, minutes, seconds) —
        const totalSeconds = Math.floor(process.uptime());
        const days = Math.floor(totalSeconds / (60 * 60 * 24));
        const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // — Gather memory usage stats (heap used vs total) —
        const memory = process.memoryUsage();
        const usedMB = (memory.heapUsed / 1024 / 1024).toFixed(2);
        const totalMB = (memory.heapTotal / 1024 / 1024).toFixed(2);

        // — Retrieve bot avatar URL for embed thumbnail —
        const avatarUrl = client.user?.avatarURL() ?? undefined;

        const embed = new EmbedBuilder()
            .setTitle("$ whoami")
            .setDescription(
                "DUCA Sentinel is the official Discord bot designed and developed for the Deakin University Cybersecurity Association (DUCA) Discord community server.",
            )
            .addFields(
                { name: "Version", value: "`v2.1.0`", inline: true },
                { name: "Uptime", value: `\`${uptime}\``, inline: true },
                { name: "Memory Usage", value: `\`${usedMB} MB / ${totalMB} MB\``, inline: true },
            )
            .setColor(0x00aeef)
            .setFooter({ text: "made w/ <3 by dec1bel" });

        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        // — Create action buttons for external links
        const joinButton = new ButtonKit()
            .setEmoji({ id: "1388383460044832850" })
            .setLabel("Join DUCA")
            .setStyle(ButtonStyle.Link)
            .setURL("https://www.dusa.org.au/clubs/deakin-university-cybersecurity-association-burwood-duca");

        const linktreeButton = new ButtonKit()
            .setEmoji({ id: "1388383479737225228" })
            .setLabel("DUCA Socials")
            .setStyle(ButtonStyle.Link)
            .setURL("https://linktr.ee/ducaclub");

        const githubButton = new ButtonKit()
            .setEmoji({ id: "1388383469712965764" })
            .setLabel("View on GitHub")
            .setStyle(ButtonStyle.Link)
            .setURL("https://github.com/duca-club/duca-sentinel");

        const row = new ActionRowBuilder<ButtonKit>().addComponents(joinButton, linktreeButton, githubButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
        logger("[/whoami]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("$ whoami")
            .setDescription(
                "We’re sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/whoami] " + String(error), "error", interaction.user.username);
    }
}
