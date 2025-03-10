export const data = {
	name: '8ball',
	description: 'Ask the magic 8-ball a question',
	options: [
		{
			name: 'question',
			description: 'The question you want to ask',
			type: 3,
			minlength: 10,
			maxlength: 250,
			required: true,
		},
	],
};

export async function run({ interaction, client }) {
	try {
		await interaction.deferReply();

		const question = interaction.options.getString('question');

		// multiple whitespaces removed, spaces replaced with '+', leading and trailing spaces removed
		const queryQuestion = question.replace(/\s+/g, '+').trim();

		// single/multiple whitespaces replaced with a single space, leading and trailing spaces removed
		let displayQuestion = question.replace(/\s+/g, ' ').trim();
		// '?' added to the end if not already present
		if (!displayQuestion.endsWith('?')) {
			displayQuestion += '?';
		}

		const response = await fetch(
			`https://eightballapi.com/api/biased?question=${queryQuestion}&lucky=false`
		);
		const reading = await response.json();
		const answer = reading.reading;

		const embed = {
			color: Math.floor(Math.random() * 16777215), // Random color
			author: {
				name: displayQuestion,
				icon_url: interaction.user.displayAvatarURL(),
			},
			description: answer,
			footer: {
				text: 'Powered by eightballapi.com',
			},
		};

		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error('Error in 8ball command:', error);

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
