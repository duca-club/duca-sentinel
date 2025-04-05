// src/commands/calendar.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import supabase from '../lib/supabaseClient.js';

export const data = new SlashCommandBuilder()
  .setName('calendar')
  .setDescription('View upcoming events from the DUCA calendar.');

export async function run({ interaction }) {
  await interaction.deferReply();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('time', { ascending: true });

  if (error || !events) {
    console.error(error);
    return interaction.editReply('❌ Failed to fetch calendar events.');
  }

  if (events.length === 0) {
    return interaction.editReply('📭 No upcoming events found.');
  }

  const embed = new EmbedBuilder()
    .setTitle('📅 DUCA Upcoming Events')
    .setColor(0x3498db)
    .setFooter({ text: 'Last updated' })
    .setTimestamp();

  // Format all events into one field with spacing between
  // Ignore the date stuff, It's there to implement setting a proper date and time instead of using a string which we could implement in the future but can remove it for now and it won't break anything
  const formatted = events.slice(0, 5).map(event => {
    const date = new Date(event.time).toLocaleString('en-AU', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Australia/Sydney'
    });

    return `**${event.name}**\n🗂 Topic: ${event.topic}\n📍 Location: ${event.location}\n🕒 Time: ${event.time}`;
  }).join('\n\n'); // ← double newline between events

  embed.addFields({
    name: '📌 Events',
    value: formatted
  });

  return interaction.editReply({ embeds: [embed] });
}
