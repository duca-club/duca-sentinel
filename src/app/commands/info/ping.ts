import type { ChatInputCommand, CommandData, CommandMetadata } from "commandkit";
import { EmbedBuilder } from "discord.js";

export const command: CommandData = {
	name: "ping",
	description: "View bot latency metrics",
};

export const metadata: CommandMetadata = {
	aliases: ["latency"],
};

export const chatInput: ChatInputCommand = async ({ interaction, client }) => {
	await interaction.deferReply();

	// Calculate interaction latency
	const reply = await interaction.fetchReply();
	const interactionLatency = reply.createdTimestamp - interaction.createdTimestamp;

	const gatewayLatency = interaction.client.ws.ping;

	// Retrieve bot avatar URL for embed thumbnail
	const botAvatarURL = client.user?.avatarURL() ?? undefined;

	const pingEmbed = new EmbedBuilder()
		.setTitle("$ ping")
		.setDescription(
			"Gateway latency shows bot <-> Discord connection delay, and interaction latency shows command response time.",
		)
		.addFields(
			{ name: "Gateway Latency", value: `${gatewayLatency}ms`, inline: true },
			{ name: "Interaction Latency", value: `${interactionLatency}ms`, inline: true },
		)
		.setColor(0x006dd4)
		.setFooter({ text: "Pong!" });

	if (botAvatarURL) {
		pingEmbed.setThumbnail(botAvatarURL);
	}

	await interaction.editReply({ embeds: [pingEmbed] });
};
