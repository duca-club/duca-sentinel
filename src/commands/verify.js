import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';

// Cache members list to avoid downloading the Excel file on every verification
// Set to be refreshed weekly on Fridays
let emailsCache = null;
let memberEmailToNameMap = null;
let cacheTimestamp = null;

// Function to check if cache should be refreshed (Friday or cache expired)
function shouldRefreshCache() {
	if (!cacheTimestamp) return true;

	const now = new Date();
	const daysSinceCache = (now - cacheTimestamp) / (24 * 60 * 60 * 1000);
	const isFriday = now.getDay() === 5;

	// Refresh if it's Friday and cache is from before today, or if cache is a week old
	return (
		(isFriday &&
			now.toDateString() !== new Date(cacheTimestamp).toDateString()) ||
		daysSinceCache >= 7
	);
}

export const data = {
	name: 'verify',
	description: 'Verify your DUCA membership and redeem the @Member role',
	options: [
		{
			name: 'email',
			description:
				'The email address associated with your DUCA membership',
			type: 3,
			required: true,
		},
	],
};

export async function run({ interaction, client }) {
	await interaction.deferReply({ ephemeral: true }).catch(console.error);

	const {
		SUPABASE_URL,
		SUPABASE_SERVICE_ROLE: SUPABASE_KEY,
		ROLE_ID,
		GUILD_ID,
	} = process.env;

	// Early validation of required environment variables
	if (![SUPABASE_URL, SUPABASE_KEY, ROLE_ID, GUILD_ID].every(Boolean)) {
		return safeReply(
			interaction,
			createErrorEmbed(
				'Configuration Error',
				'Please try again later, or contact <@889929739354140682> if the issue persists.'
			)
		);
	}

	const email = interaction.options.getString('email').trim().toLowerCase();
	const userId = interaction.user.id;
	const username = interaction.user.username;

	// Initialize Supabase
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	// Fetch guild and validate
	const guild = client.guilds.cache.get(GUILD_ID);
	if (!guild) {
		return safeReply(
			interaction,
			createErrorEmbed(
				'Server Error',
				'Please try again later, or contact <@889929739354140682> if the issue persists.'
			)
		);
	}

	try {
		// Parallel fetching of member, role, and existing user data
		const [member, role, { data: existingUser }] = await Promise.all([
			guild.members.fetch(userId),
			guild.roles.cache.get(ROLE_ID) ||
				Promise.reject(
					'Role Error. Please try again later, or contact <@889929739354140682> if the issue persists.'
				),
			supabase
				.from('verified_members')
				.select('*')
				.eq('discord_id', userId)
				.single(),
		]);

		// Early return if already verified
		if (existingUser) {
			if (!member.roles.cache.has(ROLE_ID)) await member.roles.add(role);
			return safeReply(
				interaction,
				createInfoEmbed(
					'Already Verified',
					'You already have the <@&1315576170938630158> role. No further action is needed!'
				)
			);
		}

		// Check if the email exists in our membership list
		await refreshCacheIfNeeded(supabase);

		if (!emailsCache.has(email)) {
			return safeReply(
				interaction,
				createErrorEmbed(
					'Verification Error',
					'**The email you entered does not match our membership records.** Please ensure you have entered the correct email associated with your DUCA membership and try again, or contact <@889929739354140682> if the issue persists.'
				)
			);
		}

		// Get the full name associated with this email
		const fullName = memberEmailToNameMap.get(email);

		// Perform verification actions in parallel
		await Promise.all([
			member.roles.add(role),
			supabase.from('verified_members').insert({
				discord_id: userId,
				email: email,
				full_name: fullName,
				discord_username: username,
				verified_at: new Date().toISOString(),
			}),
		]);

		return safeReply(
			interaction,
			createSuccessEmbed(
				'Verification Successful',
				`**You have been granted the ${role} role!** Please check out <#1347014155458056263> for the latest updates/events and <#1347013881876320266> to access all member content.`
			)
		);
	} catch (error) {
		console.error('Verification error:', error);
		const errorMessage =
			typeof error === 'string'
				? error
				: 'Unexpected error. Try again later.';
		return safeReply(interaction, createErrorEmbed(errorMessage));
	}
}

// Updated function to refresh cache when needed
async function refreshCacheIfNeeded(supabase) {
	// Determine if cache refresh is needed
	if (shouldRefreshCache()) {
		try {
			const { data: fileData, error: fileError } = await supabase.storage
				.from('membership_file')
				.download('members_list.xlsx');

			if (fileError)
				throw 'File Error. Please try again later, or contact <@889929739354140682> if the issue persists.';

			const workbook = xlsx.read(await fileData.arrayBuffer());
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const members = xlsx.utils.sheet_to_json(sheet);

			// Update cache - store emails in a Set for quick membership checks
			emailsCache = new Set();
			// Create a separate map to lookup names by email when needed
			memberEmailToNameMap = new Map();

			members.forEach((member) => {
				if (member['Email']) {
					const emailLower = member['Email'].trim().toLowerCase();
					emailsCache.add(emailLower);

					// Only store the name mapping if we have both email and name
					if (member['Full Name']) {
						memberEmailToNameMap.set(
							emailLower,
							member['Full Name']
						);
					}
				}
			});

			cacheTimestamp = Date.now();
		} catch (error) {
			console.error('Error fetching members list:', error);
			throw error;
		}
	}
}

// Embed Builder Functions
const createEmbed = (title, message, color, footer) => ({
	title: title,
	description: message,
	color: color,
	footer: { text: footer },
});

const createErrorEmbed = (title, msg) =>
	createEmbed(
		`<:failed:1347003107607052429> ${title}`,
		msg,
		0xff3333,
		'Beep boop! Error detected 🤖'
	);
const createSuccessEmbed = (title, msg) =>
	createEmbed(
		`<:success:1347015039835439174> ${title}`,
		msg,
		0x33cc33,
		'Thank you for being a valued member of DUCA 💗'
	);
const createInfoEmbed = (title, msg) =>
	createEmbed(
		`<a:info:1347004569917587659> ${title}`,
		msg,
		0x3399ff,
		'Thank you for being a valued member of DUCA 💗'
	);

const safeReply = async (interaction, embed) => {
	try {
		return interaction.deferred
			? interaction.editReply({ embeds: [embed] })
			: interaction.reply({
					embeds: [embed],
					flags: { ephemeral: true },
			  });
	} catch (error) {
		console.error('Reply failed:', error);
	}
};
