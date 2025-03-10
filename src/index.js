import 'dotenv/config';

import { Client, IntentsBitField, Partials } from 'discord.js';
import { CommandKit } from 'commandkit';

import { dirname as dn } from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = dn(fileURLToPath(import.meta.url));

const client = new Client({
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

new CommandKit({
	client,
	eventsPath: `${dirname}/events`,
	commandsPath: `${dirname}/commands`,
	bulkRegister: true,
});

client.login(process.env.TOKEN);
