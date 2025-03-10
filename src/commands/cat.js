export const data = {
	name: 'cat',
	description: 'Returns a random cat HTTP status code!',
};

export async function run({ interaction, client, handler }) {
	try {
		await interaction.deferReply();

		// List of valid HTTP status codes for http.cat
		const validStatusCodes = [
			100, 101, 102, 103, 200, 201, 202, 203, 204, 206, 207, 300, 301,
			302, 303, 304, 305, 307, 308, 400, 401, 402, 403, 404, 405, 406,
			407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 420,
			421, 422, 423, 424, 425, 426, 429, 431, 444, 450, 451, 497, 498,
			499, 500, 501, 502, 503, 504, 506, 507, 508, 509, 510, 511, 521,
			522, 523, 525, 599,
		];

		// Select a random status code from the valid list
		let statusCode;
		statusCode =
			validStatusCodes[
				Math.floor(Math.random() * validStatusCodes.length)
			];

		const embed = {
			title: `HTTP ${statusCode}`,
			color: getColorForStatus(statusCode),
			// description: getDescriptionForStatus(statusCode),
			image: {
				url: `https://http.cat/${statusCode}`,
			},
			footer: {
				text: 'Powered by http.cat',
			},
		};

		await interaction.editReply({ embeds: [embed] });
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

// Helper function to get a color based on the status code range
function getColorForStatus(code) {
	if (code >= 100 && code < 200) return 0x6495ed; // Blue
	if (code >= 200 && code < 300) return 0x2ecc71; // Green
	if (code >= 300 && code < 400) return 0xf1c40f; // Yellow
	if (code >= 400 && code < 500) return 0xe74c3c; // Red
	if (code >= 500) return 0x34495e; // Dark Blue/Gray
	return 0x7289da; // Discord blue as fallback
}

/* // Helper function to provide a description for common status codes
function getDescriptionForStatus(code) {
	const descriptions = {
		100: 'Continue',
		200: 'OK',
		201: 'Created',
		301: 'Moved Permanently',
		302: 'Found',
		304: 'Not Modified',
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Not Found',
		418: "I'm a teapot",
		420: 'Enhance Your Calm',
		451: 'Unavailable For Legal Reasons',
		500: 'Internal Server Error',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Timeout',
	};

	return descriptions[code] || 'HTTP Status Code';
} */
