import { ActivityType } from 'discord.js';

/** * @param {import('discord.js').Client} client */
export default (client) => {
	client.user.setActivity('DUCA 👀', { type: ActivityType.Watching });
};
