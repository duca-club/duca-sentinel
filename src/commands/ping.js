export const data = {
	name: 'ping',
	description: 'Replies with bot latency',
};

export async function run({ interaction, client }) {
	try {
		// Defer the reply first
		await interaction.deferReply();

		// Fetch the reply to calculate the ping
		const reply = await interaction.fetchReply();

		// Calculate the ping
		const ping = reply.createdTimestamp - interaction.createdTimestamp;

		// Create an embed with the ping information
		const pong = {
			color: 0x00aeef,
			title: 'Pong!',
			description: `**Roundtrip Latency:** ${ping}ms\n**Websocket Heartbeat:** ${client.ws.ping}ms`,
		};

		// Edit the deferred reply with the embed
		await interaction.editReply({ embeds: [pong] });
	} catch (error) {
		console.error('Error in ping command:', error);

		try {
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({
					content:
						'Oops, it looks like I ran into an error. Jokes on me, amiright?',
					ephemeral: true,
				});
			} else {
				await interaction.reply({
					content:
						'Oops, it looks like I ran into an error. Jokes on me, amiright?',
					ephemeral: true,
				});
			}
		} catch (followUpError) {
			console.error('Error sending error message:', followUpError);
		}
	}
}
