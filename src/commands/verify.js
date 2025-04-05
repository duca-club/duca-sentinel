// src/commands/verify.js
import { SlashCommandBuilder } from 'discord.js';
import supabase from '../lib/supabaseClient.js'; // Now using shared instance
import * as xlsx from 'xlsx';

// Cache members list to avoid downloading the Excel file on every verification
let emailsCache = null;
let memberEmailToNameMap = null;
let cacheTimestamp = null;

function shouldRefreshCache() {
  if (!cacheTimestamp) return true;

  const now = new Date();
  const daysSinceCache = (now - cacheTimestamp) / (24 * 60 * 60 * 1000);
  const isFriday = now.getDay() === 5;

  return (
    (isFriday &&
      now.toDateString() !== new Date(cacheTimestamp).toDateString()) ||
    daysSinceCache >= 7
  );
}

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Verify your DUCA membership and redeem the @Member role')
  .addStringOption(option =>
    option
      .setName('email')
      .setDescription('The email address associated with your DUCA membership')
      .setRequired(true)
  );

export async function run({ interaction, client }) {
  await interaction.deferReply({ ephemeral: true }).catch(console.error);

  const {
    ROLE_ID,
    GUILD_ID,
  } = process.env;

  if (![ROLE_ID, GUILD_ID].every(Boolean)) {
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

    await refreshCacheIfNeeded();

    if (!emailsCache.has(email)) {
      return safeReply(
        interaction,
        createErrorEmbed(
          'Verification Error',
          '**The email you entered does not match our membership records.** Please ensure you have entered the correct email associated with your DUCA membership and try again, or contact <@889929739354140682> if the issue persists.'
        )
      );
    }

    const fullName = memberEmailToNameMap.get(email);

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
        `**You have been granted the ${role} role!** Please check out <#1347067213160644659> for the latest updates/events and <#1344439191110422588> to access all member content.`
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

async function refreshCacheIfNeeded() {
  if (shouldRefreshCache()) {
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('membership_files')
        .download('members_list.xlsx');

      if (fileError)
        throw 'File Error. Please try again later, or contact <@889929739354140682> if the issue persists.';

      const workbook = xlsx.read(await fileData.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const members = xlsx.utils.sheet_to_json(sheet);

      emailsCache = new Set();
      memberEmailToNameMap = new Map();

      members.forEach((member) => {
        if (member['Email']) {
          const emailLower = member['Email'].trim().toLowerCase();
          emailsCache.add(emailLower);

          if (member['Full Name']) {
            memberEmailToNameMap.set(emailLower, member['Full Name']);
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
