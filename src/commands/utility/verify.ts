import config from "../../config/config.js";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import { isSupabaseAvailable, getSupabaseClient } from "../../lib/supabaseClient.js";
import memberCache from "../../utils/memberCache.js";
import logger from "../../utils/logger.js";

const MEMBER_ANNOUNCEMENTS_CHANNEL = "<#1347067213160644659>";
const MEMBER_RESOURCES_CHANNEL = "<#1344439191110422588>";

/**
 * Slash command definition for verify.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "verify",
    description: "Verify your DUCA membership and redeem the @Member role",
    options: [
        {
            name: "email",
            description: "The email address associated with your DUCA membership",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
};

/**
 * Main handler for the /verify command.
 * Validates membership email, assigns the Member role, and logs verification.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction, client }: SlashCommandProps): Promise<void> {
    try {
        // Defer reply ephemerally by default; post public success separately
        await interaction.deferReply({ ephemeral: true });

        const { MEMBER_ROLE_ID, GUILD_ID } = config;
        const email = interaction.options.getString("email")!.trim().toLowerCase();
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // — Supabase Check —
        if (!isSupabaseAvailable()) {
            throw new Error("Supabase disabled. Enable Supabase to restore functionality");
        }

        // — Guild & Role Setup —
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) {
            logger("[/verify] Invalid guild", "error", username);
            return safeReply(interaction, createErrorEmbed());
        }

        const role = guild.roles.cache.get(MEMBER_ROLE_ID);
        if (!role) {
            logger("[/verify] Invalid role", "error", username);
            return safeReply(interaction, createErrorEmbed());
        }

        // Fetch member to inspect and modify roles
        const member = await guild.members.fetch(userId);

        // — Existing Verification Check —
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error("Supabase client unavailable. Enable Supabase to restore functionality");
        }

        const { data: existing, error: fetchError } = await supabase
            .from("verified_members")
            .select("discord_id")
            .eq("discord_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            // Restore role if missing or inform user
            if (!member.roles.cache.has(MEMBER_ROLE_ID)) {
                try {
                    await member.roles.add(role);
                    logger("[/verify] Restored missing role", "success", username);
                } catch {
                    logger("[/verify] Unable to restore role", "error", username);
                    return safeReply(interaction, createInfoEmbed(role.toString()));
                }
            }

            logger("[/verify] Already verified", "info", username);
            return safeReply(interaction, createInfoEmbed(role.toString()));
        }

        // — Membership Validation —
        // Ensure the cache is current before checking the email list
        await memberCache.refresh();
        if (!memberCache.has(email)) {
            logger("[/verify] Invalid email", "info", username);
            return safeReply(interaction, createErrorEmbed());
        }
        const fullName = memberCache.getFullName(email);
        if (!fullName) {
            logger("[/verify] Could not retrieve full name", "error", username);
            return safeReply(interaction, createErrorEmbed());
        }

        // — Role Assignment & Database Upsert —
        try {
            await member.roles.add(role);
        } catch {
            logger("[/verify] Invalid permissions", "error", username);
            return safeReply(interaction, createErrorEmbed());
        }

        // Upsert handles both insert and update to prevent duplicates
        const { error: upsertError } = await supabase.from("verified_members").upsert({
            discord_id: userId,
            email,
            full_name: fullName,
            discord_username: username,
            verified_at: new Date().toISOString(),
        });

        if (upsertError) {
            // Revert role assignment on failure to keep state consistent
            await member.roles
                .remove(role)
                .catch(() => logger("[/verify] Failed to rollback role after DB error", "warn", username));
            throw upsertError;
        }

        logger("[/verify]", "success", username);
        try {
            await interaction.deleteReply();
        } catch {}
        await interaction.followUp({
            embeds: [createSuccessEmbed(role.toString(), `<@${userId}>`)],
            ephemeral: false,
        });
        return;
    } catch (error) {
        logger("[/verify] " + String(error), "error", interaction.user.username);
        return safeReply(interaction, createErrorEmbed());
    }
}

/**
 * Generic error embed.
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("$ verify")
        .setDescription(
            "We're sorry — an unexpected error occurred.\n Please try again later or contact an administrator if the issue persists.",
        )
        .addFields({
            name: "Known Issues",
            value: "Due to a limitation from DUSA, it may take up to one week for your details to appear in our system. We appreciate your patience!",
        })
        .setColor(0xff3333)
        .setFooter({ text: "exit status: 1" });
}

/**
 * Success embed.
 * @param {string} roleName
 * @param {string} mention - user mention to include in the embed
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(roleName: string, mention?: string): EmbedBuilder {
    const header = mention ? `${mention} You have been granted ${roleName}!` : `You have been granted ${roleName}!`;
    return new EmbedBuilder()
        .setTitle("$ verify")
        .setDescription(
            `**${header}**\n Explore ${MEMBER_ANNOUNCEMENTS_CHANNEL} and ${MEMBER_RESOURCES_CHANNEL} for exclusive member content.`,
        )
        .setColor(0x33cc33)
        .setFooter({ text: "Thank you for being a valued DUCA member 💗" });
}

/**
 * Informational embed.
 * @param {string} roleName
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(roleName: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("$ verify")
        .setDescription(`You are already a **${roleName}** — no further action needed!`)
        .setColor(0x00aeef)
        .setFooter({ text: "Thank you for being a valued DUCA member 💗" });
}

/**
 * Replies or edits the interaction safely based on deferred state.
 * @param {import('discord.js').Interaction} interaction
 * @param {EmbedBuilder} embed
 * @param {boolean} ephemeral - Whether the response should be ephemeral
 */
const safeReply = async (interaction: any, embed: EmbedBuilder, ephemeral: boolean = true) => {
    try {
        if (interaction.deferred) {
            // For deferred interactions, edit the reply (stays ephemeral if originally deferred ephemerally)
            if (ephemeral) {
                return interaction.editReply({ embeds: [embed] });
            }
            // remove the ephemeral placeholder if possible and follow up publicly
            try {
                await interaction.deleteReply();
            } catch {}
            return interaction.followUp({ embeds: [embed], ephemeral: false });
        }
        // Not deferred: reply directly with proper ephemeral flag
        return interaction.reply({ embeds: [embed], ephemeral });
    } catch (err) {
        logger("[/verify] Failed to send reply: " + String(err), "error", interaction.user.username);
    }
};
