import {
	type ChatInputCommand,
	type CommandData,
	type CommandMetadata,
	Container,
	Separator,
	TextDisplay,
} from "commandkit";
import { Logger } from "commandkit/logger";
import { createRateLimiter } from "commandkit/ratelimit";
import {
	type GuildMember,
	type InteractionEditReplyOptions,
	MessageFlags,
	type Role,
	SeparatorSpacingSize,
} from "discord.js";
import isEmail from "validator/lib/isEmail";
import { verifyMemberFlag } from "../../../flags/verifyCommandFlag.ts";
import { supabaseClient } from "../../../lib/supabaseClient.ts";

const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID!;
const MEMBER_ANNOUNCEMENTS_CHANNEL = "<#1365844506636849224>";
const MEMBER_RESOURCES_CHANNEL = "<#1365844612228448407>";
const MEMBER_CHAT_CHANNEL = "<#1485613248936935434>";
const DUCA_LOGO = "<:duca_logo:1364096341310963752>";

// Allow 3 verification attempts per user per 10 minutes
const MAX_REQUESTS = 3;
const verifyRateLimiter = createRateLimiter({
	maxRequests: MAX_REQUESTS,
	interval: 10 * 60 * 1000,
});

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function errorEmbed(remainingRequests?: number): InteractionEditReplyOptions {
	const footer = `${remainingRequests} request${remainingRequests !== 1 ? "s" : ""} remaining`;
	const embed = (
		<Container accentColor={0xff3333}>
			<TextDisplay>### $ verify</TextDisplay>
			<TextDisplay>**Something went wrong with your request.**</TextDisplay>
			<TextDisplay>Please try again later or contact an admin if the issue persists.</TextDisplay>
			<TextDisplay>-# {footer}</TextDisplay>
		</Container>
	);
	return { components: [embed], flags: MessageFlags.IsComponentsV2 };
}

function infoEmbed(message: string, remainingRequests?: number): InteractionEditReplyOptions {
	const footer = `${remainingRequests} request${remainingRequests !== 1 ? "s" : ""} remaining`;
	const embed = (
		<Container accentColor={0x00aeef}>
			<TextDisplay>### $ verify</TextDisplay>
			<TextDisplay>{message}</TextDisplay>
			<Separator spacing={SeparatorSpacingSize.Small} />
			<TextDisplay>**Known Issues**</TextDisplay>
			<TextDisplay>
				Please note that it takes up to Saturday of the next week for DUSA to update new signups. We appreciate
				your patience!
			</TextDisplay>
			<TextDisplay>-# {footer}</TextDisplay>
		</Container>
	);
	return { components: [embed], flags: MessageFlags.IsComponentsV2 };
}

function successEmbed(email: string, full_name: string, studentID: string | null): InteractionEditReplyOptions {
	const hasStudentID = studentID && String(studentID).trim() !== "";
	const memberDetails = hasStudentID
		? `-# **Full Name:** ${full_name}\n` +
			`-# **Email:** ${email}\n` +
			`-# **Student ID:** ${String(studentID).trim()}`
		: `-# **Full Name:** ${full_name}\n` + `-# **Email:** ${email}`;
	const embed = (
		<Container accentColor={0x33cc33}>
			<TextDisplay>### $ verify</TextDisplay>
			<TextDisplay>
				Your membership has been verified and you have been assigned the {"<@&" + MEMBER_ROLE_ID + ">"} role!
			</TextDisplay>
			<Separator spacing={SeparatorSpacingSize.Small} />
			<TextDisplay>**Membership Details**</TextDisplay>
			<TextDisplay>{memberDetails}</TextDisplay>
			<Separator spacing={SeparatorSpacingSize.Small} />
			<TextDisplay>**What To Do Next**</TextDisplay>
			<TextDisplay>
				- Introduce yourself and hang out with other members in the {MEMBER_CHAT_CHANNEL} channel.
			</TextDisplay>
			<TextDisplay>
				- Explore {MEMBER_ANNOUNCEMENTS_CHANNEL} and {MEMBER_RESOURCES_CHANNEL} for exclusive member content.
			</TextDisplay>
			<TextDisplay>-# Thank you for being a valuable member of DUCA {DUCA_LOGO}</TextDisplay>
		</Container>
	);
	return { components: [embed], flags: MessageFlags.IsComponentsV2 };
}

function getRateLimitKey(interaction: Parameters<ChatInputCommand>[0]["interaction"]): string {
	const guildID = interaction.guildId;
	const userID = interaction.user.id;
	return guildID ? `verify:${guildID}:${userID}` : `verify:dm:${userID}`;
}

async function ensureWithinRateLimit(interaction: Parameters<ChatInputCommand>[0]["interaction"]): Promise<boolean> {
	const key = getRateLimitKey(interaction);
	const allowed = await verifyRateLimiter.limit(key);

	if (!allowed) {
		const resetTimeMs = await verifyRateLimiter.getResetTime(key);
		const resetMinutes = Math.ceil(resetTimeMs / 60_000);
		await interaction.editReply(
			infoEmbed(
				`-# **RATE LIMIT EXCEEDED**\nPlease wait \`${resetMinutes}\` minute${resetMinutes !== 1 ? "s" : ""}, then try again.`,
				0,
			),
		);
		Logger.info(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, resetMinutes=${resetMinutes}] | Rate limit exceeded`,
		);
	}
	return allowed;
}

async function ensureMemberRole(args: {
	member: GuildMember;
	memberRole: Role;
	interaction: Parameters<ChatInputCommand>[0]["interaction"];
	remainingRequests: number;
}): Promise<boolean> {
	const { member, memberRole, interaction, remainingRequests } = args;

	if (member.roles.cache.has(memberRole.id)) return true;

	try {
		await member.roles.add(memberRole);
		return true;
	} catch (err) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, roleID=${memberRole.id}] | Failed to add member role
			\n${String(err)}`,
		);
		return false;
	}
}

async function upsertVerifiedMember(args: {
	discordId: string;
	email: string;
	fullName: string;
	discordUsername: string;
}): Promise<void> {
	const { discordId, email, fullName, discordUsername } = args;

	const result = await supabaseClient.from("verified_members").upsert(
		{
			discord_id: discordId,
			email,
			full_name: fullName,
			discord_username: discordUsername,
			verified_at: new Date().toISOString(),
		},
		{ onConflict: "discord_id" },
	);

	if (result.error) {
		Logger.error(
			`[discordId=${discordId}, email=${email}] | upsert 'verified_members' failed
			\n${String(result.error)}`,
		);
	}
}

export const command: CommandData = {
	name: "verify",
	description: "Verify your membership and receive the @Member role",
	options: [
		{
			name: "email",
			description: "The email address associated with your DUCA membership",
			type: 3, // String
			required: true,
		},
	],
};

export const metadata: CommandMetadata = {
	botPermissions: ["ManageRoles", "SendMessages", "SendMessagesInThreads"],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Feature flag check
	const featureEnabled = await verifyMemberFlag();
	const remainingRequests = await verifyRateLimiter.getRemaining(getRateLimitKey(interaction));
	if (!featureEnabled) {
		await interaction.editReply(
			infoEmbed(
				"This command is currently disabled. Please try again later.",
				remainingRequests,
			),
		);
		Logger.info(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}] Command disabled via feature flag`,
		);
		return;
	}

	// Per-user rate limiting
	if (!(await ensureWithinRateLimit(interaction))) {
		return;
	}

	const member = interaction.member as GuildMember | null;
	if (!member) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.info(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}] | Unable to resolve server member information`,
		);
		return;
	}

	const rawEmail = interaction.options.getString("email", true);
	const email = normalizeEmail(rawEmail);
	Logger.log(
		`[username=${interaction.user.username}, discordId=${interaction.user.id}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | Command invoked`,
	);

	if (!isEmail(email)) {
		await interaction.editReply(errorEmbed(remainingRequests));
		//await interaction.editReply(infoEmbed("Please provide a valid email address.", remainingRequests));
		Logger.info(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | Invalid email address`,
		);
		return;
	}

	const guild = interaction.guild;
	const memberRole = guild?.roles.cache.get(MEMBER_ROLE_ID);
	if (!memberRole) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | MEMBER_ROLE_ID role not found in guild`,
		);
		return;
	}

	/* Verification Flow
	1) Always look up the provided email in `member_list`
	2) Look up `verified_members` by `discord_id` (answers: if already verified or not)
	3) ONLY if NO `discord_id` row exists, look up `verified_members` by `email` (answers: if email registered by another account). */
	const discordID = interaction.user.id;

	const memberListResult = await supabaseClient
		.from("member_list")
		.select("email, full_name, student_id")
		.eq("email", email)
		.maybeSingle<{ email: string; full_name: string; student_id: string | null }>();

	if (memberListResult.error) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | member_list query failed
			\n${String(memberListResult.error)}`,
		);
		return;
	}
	if (!memberListResult.data) {
		await interaction.editReply(
			infoEmbed(
				"The provided email address was not found in our membership records. Verify you are using the same email address associated with your DUCA membership.",
				remainingRequests,
			),
		);
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | member_list query failed
			\n${String(memberListResult.error)}`,
		);
		return;
	}

	const verifiedByDiscord = await supabaseClient
		.from("verified_members")
		.select("discord_id, email")
		.eq("discord_id", discordID)
		.maybeSingle<{ discord_id: string | number; email: string }>();

	if (verifiedByDiscord.error) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}, discordId=${discordID}] | 'verified_members' by 'discord_id' query failed
			\n${String(memberListResult.error)}`,
		);
		return;
	}

	const memberData = memberListResult.data;
	const fullName = memberData.full_name;
	const studentID = memberData.student_id;

	if (verifiedByDiscord.data) {
		// Edge case: discord account already verified with a different email.
		if (verifiedByDiscord.data.email !== email) {
			await interaction.editReply(
				infoEmbed(
					"You're already verified with a different email address. If you believe this is a mistake, please contact an admin.",
					remainingRequests,
				),
			);
			Logger.info(
				`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email} | Verified with different email`,
			);
			return;
		}

		// Edge case: same email but role missing (verified row exists but user doesn't have @Member).
		const ok = await ensureMemberRole({
			member,
			memberRole,
			interaction,
			remainingRequests,
		});
		if (!ok) return;

		await upsertVerifiedMember({
			discordId: discordID,
			email,
			fullName,
			discordUsername: interaction.user.username,
		});

		await interaction.editReply(successEmbed(email, fullName, studentID));
		return;
	}

	// Edge case: No verified row for this discord_id. Check if the provided email is linked to another discord account.
	const verifiedByEmail = await supabaseClient
		.from("verified_members")
		.select("discord_id, email")
		.eq("email", email)
		.maybeSingle<{ discord_id: string | number; email: string }>();

	if (verifiedByEmail.error) {
		await interaction.editReply(errorEmbed(remainingRequests));
		Logger.error(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email}] | 'verified_members' by 'email' query failed
			\n${String(verifiedByEmail.error)}`,
		);
		return;
	}

	if (verifiedByEmail.data && String(verifiedByEmail.data.discord_id) !== String(discordID)) {
		await interaction.editReply(
			infoEmbed(
				"You're already verified with a different Discord account. If you believe this is a mistake, please contact an admin.",
				remainingRequests,
			),
		);
		Logger.info(
			`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email} | Verified with different Discord account`,
		);
		return;
	}

	// New verification OR role exists but DB row doesn't (manual role assignment).
	const ok = await ensureMemberRole({
		member,
		memberRole,
		interaction,
		remainingRequests,
	});
	if (!ok) return;

	await upsertVerifiedMember({
		discordId: discordID,
		email,
		fullName,
		discordUsername: interaction.user.username,
	});

	await interaction.editReply(successEmbed(email, fullName, studentID));
	Logger.info(
		`[username=${interaction.user.username}, guildID=${interaction.guildId ?? "DM"}, email=${email} | Verified successfully`,
	);
};
