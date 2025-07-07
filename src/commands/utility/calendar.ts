import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { CommandData, SlashCommandProps } from "commandkit";
import { isSupabaseAvailable, getSupabaseClient } from "../../lib/supabaseClient.js";
import logger from "../../utils/logger.js";

/**
 * Slash command definition for calendar.
 * @type {CommandData}
 */
export const data: CommandData = {
    name: "calendar",
    description: "Display a list of upcoming DUCA events",
    options: [
        {
            name: "category",
            description: "Filter upcoming events by category",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "CTF", value: "ctf" },
                { name: "Cyber Essentials", value: "essentials" },
                { name: "Networking", value: "networking" },
                { name: "Pentesting", value: "pentesting" },
            ],
        },
    ],
};

/**
 * Main handler for the /calendar command.
 * Queries Supabase for future events (optionally filters by category), formats results, and replies with an embed.
 * @param {SlashCommandProps} props - The command properties provided by CommandKit.
 * @param {Client<true>} props.client - The Discord.js client instance.
 * @param {import("commandkit").CommandKit} props.handler - The CommandKit handler instance.
 * @param {ChatInputCommandInteraction<import("discord.js").CacheType>} props.interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves after editing the deferred reply.
 */
export async function run({ interaction }: SlashCommandProps): Promise<void> {
    // Defer reply to allow time for database fetch
    await interaction.deferReply();

    // Get optional category filter from user input
    const category = interaction.options.getString("category");

    try {
        // — Check if Supabase is available —
        if (!isSupabaseAvailable()) {
            throw new Error("Supabase disabled. Enable Supabase to restore functionality");
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error("Supabase client unavailable. Enable Supabase to restore functionality");
        }

        // — Build base query for events on or after today —
        const today = new Date().toISOString().split("T")[0];
        let query = supabase
            .from("events")
            .select("*")
            .gte("date", today)
            // sort chronologically
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

        // — Apply category filter if provided —
        if (category) {
            query = query.eq("category", category);
        }

        // Execute the query
        const { data: events, error } = await query;
        if (error) throw error;

        // — Handle no matching events —
        if (!events?.length) {
            const noEventsEmbed = new EmbedBuilder()
                .setTitle(`$ calendar ${category || ""}`)
                .setDescription(
                    "No upcoming events found matching those filters.\n Try adjusting your query or please try again later.",
                )
                .setColor(0xffcc00);

            await interaction.editReply({ embeds: [noEventsEmbed] });
            logger("[/calendar] No events matched query", "info", interaction.user.username);
            return;
        }

        // — Map events to embed fields —
        const fields = events.map((event) => {
            const iso = `${event.date}T${event.start_time}`;
            const timestamp = Math.floor(new Date(iso).getTime() / 1000);

            return {
                name: `${event.title}`,
                value: `<:tag:1388383526289670184> ${event.category} <:pin:1388383493318508727> ${event.location} <:clock:1388383448024223794> <t:${timestamp}:f>`,
            };
        });

        const embed = new EmbedBuilder()
            .setTitle(`$ calendar ${category || ""}`)
            .addFields(fields)
            .setColor(0x00aeef)
            .setFooter({ text: "Last Updated" })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger("[/calendar]", "success", interaction.user.username);
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle(`$ calendar ${category || ""}`)
            .setDescription(
                "We're sorry — an unexpected error occurred!\n Please try again later or contact an administrator if the issue persists.",
            )
            .setColor(0xff3333)
            .setFooter({ text: "exit status: 1" });

        await interaction.editReply({ embeds: [errorEmbed] });
        logger("[/calendar] " + String(error), "error", interaction.user.username);
    }
}
