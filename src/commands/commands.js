export const data = {
	name: 'commands',
	description: 'Display a list of all available commands',
};

export async function run({ interaction, client }) {
	try {
		await interaction.deferReply();

		const reply = {
			color: 0x00aeef,
			title: 'Commands',
			thumbnail: {
				url: client.user.avatarURL(),
			},
			description:
				"Please note DUCA Sentinel is still in early development and as such, these commands may not reflect Obfusc8's full functionality.",
			fields: [
				{ name: 'Utility', value: '` commands ` ` ping ` ` verify `' },
				{ name: 'Fun', value: '` 8ball ` `cat ` ` flip `' },
			],
		};

		await interaction.editReply({ embeds: [reply] });
	} catch (error) {
		console.error('Error in commands command:', error);

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
