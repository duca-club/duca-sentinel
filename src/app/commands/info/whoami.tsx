import { ActionRow, Button, type ChatInputCommand, type CommandData, type CommandMetadata } from "commandkit";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import packageJson from "../../../../package.json";

export const command: CommandData = {
	name: "whoami",
	description: "Learn more about DUCA Sentinel",
};

export const metadata: CommandMetadata = {
	aliases: ["about", "info"],
};

export const chatInput: ChatInputCommand = async ({ interaction, client }) => {
	await interaction.deferReply();

	// Calculate process uptime (days, hours, minutes, seconds)
	const totalSeconds = Math.floor(process.uptime());
	const days = Math.floor(totalSeconds / (60 * 60 * 24));
	const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

	// Retrieve bot avatar URL for embed thumbnail
	const botAvatarURL = client.user?.avatarURL() ?? undefined;

	const replyEmbed = new EmbedBuilder()
		.setTitle("$ whoami")
		.setDescription(
			"DUCA Sentinel is the official Discord bot developed for the Deakin University Cybersecurity Association (DUCA) Discord server.",
		)
		.addFields(
			{ name: "Version", value: `\`${packageJson.version}\``, inline: true },
			{ name: "Uptime", value: `\`${uptime}\``, inline: true },
		)
		.setColor(0x006dd4)
		.setFooter({ text: "made w/ <3 by dec1bel" });

	if (botAvatarURL) {
		replyEmbed.setThumbnail(botAvatarURL);
	}

	const buttonRow = (
		<ActionRow>
			<Button
				emoji={"<:user_bold_96px_00aeef:1503237142753841212>"}
				style={ButtonStyle.Link}
				url="https://www.dusa.org.au/clubs/deakin-university-cybersecurity-association-burwood-duca"
			>
				Join DUCA
			</Button>
			<Button
				emoji={"<:linktree_bold__96px_00aeef:1503237140836909109>"}
				style={ButtonStyle.Link}
				url="https://linktr.ee/ducaclub"
			>
				Socials
			</Button>
			<Button
				emoji={"<:github_bold_96px_00aeef:1503237138643288154>"}
				style={ButtonStyle.Link}
				url="https://github.com/duca-club/duca-sentinel"
			>
				GitHub
			</Button>
		</ActionRow>
	);

	await interaction.editReply({ embeds: [replyEmbed], components: [buttonRow] });
};
