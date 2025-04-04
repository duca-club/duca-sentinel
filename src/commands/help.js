export const data = {
	name: 'help',
	description: 'Display a list of all available commands',
};

export async function run({ interaction, client }) {
	try {
		await interaction.deferReply();

		const reply = {
			color: 0x00aeef,
			title: 'Help',
			thumbnail: {
				url: client.user.avatarURL(),
			},
			description:
				"Please note DUCA Sentinel is still in early development and as such, these commands may not reflect DUCA Sentinel's full functionality.",
				fields: [
					{ 
						name: 'Utility', 
						value: 
							'• `ping` - Check if the bot is responsive.\n' +
							'  Example: `/ping`\n\n' +
							'• `verify` - Start the verification process by entering the email you used to sign up to the club with.\n' +
							'  Example: `/verify s223932052@deakin.edu.au`\n\u200b' // invisible char for extra spacing
					},
					{ 
						name: 'Fun', 
						value: 
							'• `8ball` - Ask the magic 8-ball a question.\n' +
							'  Example: `/8ball Will I pass my exam?`\n\n' +
							'• `cat` - Get a random cat picture.\n' +
							'  Example: `/cat`\n\n' +
							'• `flip` - Flip a coin.\n' +
							'  Example: `/flip`\n\u200b'
					},
					{ 
						name: 'Miscellaneous', 
						value: 
							'• `help` - Show this help message.\n' +
							'  Example: `/help`'
					}
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
