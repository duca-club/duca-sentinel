export const data = {
	name: 'flip',
	description: 'Flip a coin',
};

export async function run({ interaction, client }) {
	try {
		await interaction.deferReply();

		const randomNumber = Math.random(); // Generate random number between 0 and 1
		const result = randomNumber < 0.5 ? 'heads' : 'tails'; // Determine heads or tails

		await interaction.editReply(
			`${interaction.user} flipped a coin, it's **${result}**!`
		);
	} catch (error) {
		console.error('Error in flip command:', error);

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
