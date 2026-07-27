from datetime import UTC, datetime

import discord
from discord import app_commands, ui
from discord.ext import commands
from email_validator import EmailNotValidError, validate_email
from supabase import PostgrestAPIError

from duca_sentinel.flags.verify_command_flag import verify_member_flag
from duca_sentinel.lib import emojis
from duca_sentinel.lib.components import ContainerView
from duca_sentinel.lib.env_config import env_config
from duca_sentinel.lib.logger import Logger
from duca_sentinel.lib.ratelimit import create_rate_limiter
from duca_sentinel.lib.supabase_client import supabase

MEMBER_ROLE_ID = env_config.MEMBER_ROLE_ID
MEMBER_ANNOUNCEMENTS_CHANNEL = "<#1347067213160644659>"
MEMBER_RESOURCES_CHANNEL = "<#1344439191110422588>"
MEMBER_CHAT_CHANNEL = "<#1344438888365555833>"

# Allow 3 verification attempts per user per 10 minutes
MAX_REQUESTS = 3
verify_rate_limiter = create_rate_limiter(max_requests=MAX_REQUESTS, interval=10 * 60 * 1000)


def normalize_email(email: str) -> str:
	return email.strip().lower()


def is_email(email: str) -> bool:
	try:
		validate_email(email, check_deliverability=False)
	except EmailNotValidError:
		return False
	return True


def _remaining_footer(remaining_requests: int | None) -> str:
	return f"{remaining_requests} request{'' if remaining_requests == 1 else 's'} remaining"


def error_view(remaining_requests: int | None = None) -> ContainerView:
	footer = _remaining_footer(remaining_requests)
	return ContainerView(
		ui.Container(
			ui.TextDisplay("### $ verify"),
			ui.TextDisplay("**Something went wrong with your request.**"),
			ui.TextDisplay("Please try again later or contact an admin if the issue persists."),
			ui.TextDisplay(f"-# {footer}"),
			accent_colour=0xFF3333,
		)
	)


def info_view(message: str, remaining_requests: int | None = None) -> ContainerView:
	footer = _remaining_footer(remaining_requests)
	return ContainerView(
		ui.Container(
			ui.TextDisplay("### $ verify"),
			ui.TextDisplay(message),
			ui.Separator(spacing=discord.SeparatorSpacing.small),
			ui.TextDisplay("**Known Issues**"),
			ui.TextDisplay(
				"Please note that it takes up to Saturday of the next week for DUSA to update new signups. "
				"We appreciate your patience!"
			),
			ui.TextDisplay(f"-# {footer}"),
			accent_colour=0x00AEEF,
		)
	)


def success_view(email: str, full_name: str, student_id: str | None) -> ContainerView:
	has_student_id = student_id is not None and str(student_id).strip() != ""
	if has_student_id:
		member_details = (
			f"-# **Full Name:** {full_name}\n-# **Email:** {email}\n-# **Student ID:** {str(student_id).strip()}"
		)
	else:
		member_details = f"-# **Full Name:** {full_name}\n-# **Email:** {email}"

	return ContainerView(
		ui.Container(
			ui.TextDisplay("### $ verify"),
			ui.TextDisplay(
				f"Your membership has been verified and you have been assigned the <@&{MEMBER_ROLE_ID}> role!"
			),
			ui.Separator(spacing=discord.SeparatorSpacing.small),
			ui.TextDisplay("**Membership Details**"),
			ui.TextDisplay(member_details),
			ui.Separator(spacing=discord.SeparatorSpacing.small),
			ui.TextDisplay("**What To Do Next**"),
			ui.TextDisplay(
				f"- Introduce yourself and hang out with other members in the {MEMBER_CHAT_CHANNEL} channel."
			),
			ui.TextDisplay(
				f"- Explore {MEMBER_ANNOUNCEMENTS_CHANNEL} and {MEMBER_RESOURCES_CHANNEL} for exclusive member content."
			),
			ui.TextDisplay(f"-# Thank you for being a valuable member of DUCA {emojis.get(emojis.DUCA_LOGO)}"),
			accent_colour=0x33CC33,
		)
	)


def get_rate_limit_key(interaction: discord.Interaction) -> str:
	guild_id = interaction.guild_id
	user_id = interaction.user.id
	return f"verify:{guild_id}:{user_id}" if guild_id else f"verify:dm:{user_id}"


def _log_context(interaction: discord.Interaction) -> str:
	return f"username={interaction.user.name}, guildID={interaction.guild_id or 'DM'}"


async def ensure_within_rate_limit(interaction: discord.Interaction) -> bool:
	key = get_rate_limit_key(interaction)
	allowed = await verify_rate_limiter.limit(key)

	if not allowed:
		reset_time_ms = await verify_rate_limiter.get_reset_time(key)
		reset_minutes = -(-int(reset_time_ms) // 60_000)  # ceil
		await interaction.edit_original_response(
			view=info_view(
				f"-# **RATE LIMIT EXCEEDED**\nPlease wait `{reset_minutes}` "
				f"minute{'' if reset_minutes == 1 else 's'}, then try again.",
				0,
			)
		)
		Logger.info(f"[{_log_context(interaction)}, resetMinutes={reset_minutes}] | Rate limit exceeded")
	return allowed


async def ensure_member_role(
	member: discord.Member,
	member_role: discord.Role,
	interaction: discord.Interaction,
	remaining_requests: int,
) -> bool:
	if member_role in member.roles:
		return True

	try:
		await member.add_roles(member_role)
	except discord.HTTPException as error:
		await interaction.edit_original_response(view=error_view(remaining_requests))
		Logger.error(f"[{_log_context(interaction)}, roleID={member_role.id}] | Failed to add member role\n{error}")
		return False
	return True


async def upsert_verified_member(discord_id: str, email: str, full_name: str, discord_username: str) -> None:
	try:
		await (
			supabase.table("verified_members")
			.upsert(
				{
					"discord_id": discord_id,
					"email": email,
					"full_name": full_name,
					"discord_username": discord_username,
					"verified_at": datetime.now(UTC).isoformat(),
				},
				on_conflict="discord_id",
			)
			.execute()
		)
	except PostgrestAPIError as error:
		Logger.error(f"[discordId={discord_id}, email={email}] | upsert 'verified_members' failed\n{error}")


class Verify(commands.Cog):
	def __init__(self, bot: commands.Bot) -> None:
		self.bot = bot

	@app_commands.command(name="verify", description="Verify your membership and receive the @Member role")
	@app_commands.describe(email="The email address associated with your DUCA membership")
	@app_commands.checks.bot_has_permissions(manage_roles=True, send_messages=True, send_messages_in_threads=True)
	async def verify(self, interaction: discord.Interaction, email: str) -> None:
		await interaction.response.defer(ephemeral=True)

		# Feature flag check
		feature_enabled = await verify_member_flag()
		remaining_requests = await verify_rate_limiter.get_remaining(get_rate_limit_key(interaction))
		if not feature_enabled:
			await interaction.edit_original_response(
				view=info_view("This command is currently disabled. Please try again later.", remaining_requests)
			)
			Logger.info(f"[{_log_context(interaction)}] Command disabled via feature flag")
			return

		# Per-user rate limiting
		if not await ensure_within_rate_limit(interaction):
			return

		member = interaction.user if isinstance(interaction.user, discord.Member) else None
		if member is None:
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.info(f"[{_log_context(interaction)}] | Unable to resolve server member information")
			return

		raw_email = email
		email = normalize_email(raw_email)
		Logger.log(
			f"[username={interaction.user.name}, discordId={interaction.user.id}, "
			f"guildID={interaction.guild_id or 'DM'}, email={email}] | Command invoked"
		)

		if not is_email(email):
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.info(f"[{_log_context(interaction)}, email={email}] | Invalid email address")
			return

		guild = interaction.guild
		member_role = guild.get_role(int(MEMBER_ROLE_ID)) if guild else None
		if member_role is None:
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.error(f"[{_log_context(interaction)}, email={email}] | MEMBER_ROLE_ID role not found in guild")
			return

		# Verification Flow
		# 1) Always look up the provided email in `member_list`
		# 2) Look up `verified_members` by `discord_id` (answers: if already verified or not)
		# 3) ONLY if NO `discord_id` row exists, look up `verified_members` by `email`
		#    (answers: if email registered by another account).
		discord_id = str(interaction.user.id)

		try:
			member_list_result = (
				await supabase.table("member_list")
				.select("email, full_name, student_id")
				.eq("email", email)
				.maybe_single()
				.execute()
			)
		except PostgrestAPIError as error:
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.error(f"[{_log_context(interaction)}, email={email}] | member_list query failed\n{error}")
			return

		if member_list_result is None:
			await interaction.edit_original_response(
				view=info_view(
					"The provided email address was not found in our membership records. Verify you are using "
					"the same email address associated with your DUCA membership.",
					remaining_requests,
				)
			)
			Logger.info(f"[{_log_context(interaction)}, email={email}] | Email not found in member_list")
			return

		try:
			verified_by_discord = (
				await supabase.table("verified_members")
				.select("discord_id, email")
				.eq("discord_id", discord_id)
				.maybe_single()
				.execute()
			)
		except PostgrestAPIError as error:
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.error(
				f"[{_log_context(interaction)}, email={email}, discordId={discord_id}] | "
				f"'verified_members' by 'discord_id' query failed\n{error}"
			)
			return

		member_data = member_list_result.data
		full_name = member_data["full_name"]
		student_id = member_data["student_id"]

		if verified_by_discord is not None:
			# Edge case: discord account already verified with a different email.
			if verified_by_discord.data["email"] != email:
				await interaction.edit_original_response(
					view=info_view(
						"You're already verified with a different email address. If you believe this is a "
						"mistake, please contact an admin.",
						remaining_requests,
					)
				)
				Logger.info(f"[{_log_context(interaction)}, email={email} | Verified with different email")
				return

			# Edge case: same email but role missing (verified row exists but user doesn't have @Member).
			ok = await ensure_member_role(member, member_role, interaction, remaining_requests)
			if not ok:
				return

			await upsert_verified_member(
				discord_id=discord_id,
				email=email,
				full_name=full_name,
				discord_username=interaction.user.name,
			)

			await interaction.edit_original_response(view=success_view(email, full_name, student_id))
			return

		# Edge case: No verified row for this discord_id. Check if the provided email is linked to
		# another discord account.
		try:
			verified_by_email = (
				await supabase.table("verified_members")
				.select("discord_id, email")
				.eq("email", email)
				.maybe_single()
				.execute()
			)
		except PostgrestAPIError as error:
			await interaction.edit_original_response(view=error_view(remaining_requests))
			Logger.error(
				f"[{_log_context(interaction)}, email={email}] | 'verified_members' by 'email' query failed\n{error}"
			)
			return

		if verified_by_email is not None and str(verified_by_email.data["discord_id"]) != str(discord_id):
			await interaction.edit_original_response(
				view=info_view(
					"You're already verified with a different Discord account. If you believe this is a "
					"mistake, please contact an admin.",
					remaining_requests,
				)
			)
			Logger.info(f"[{_log_context(interaction)}, email={email} | Verified with different Discord account")
			return

		# New verification OR role exists but DB row doesn't (manual role assignment).
		ok = await ensure_member_role(member, member_role, interaction, remaining_requests)
		if not ok:
			return

		await upsert_verified_member(
			discord_id=discord_id,
			email=email,
			full_name=full_name,
			discord_username=interaction.user.name,
		)

		await interaction.edit_original_response(view=success_view(email, full_name, student_id))
		Logger.info(f"[{_log_context(interaction)}, email={email} | Verified successfully")


async def setup(bot: commands.Bot) -> None:
	await bot.add_cog(Verify(bot))
