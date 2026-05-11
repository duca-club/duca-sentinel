import type { MiddlewareContext } from "commandkit";
import { useEnvironment } from "commandkit";
import { Logger } from "commandkit/logger";
import { MessageFlags } from "discord.js";

const ERROR_MESSAGE = "Something went wrong. Please try again later.";

export async function afterExecute(ctx: MiddlewareContext) {
	const error = useEnvironment().getExecutionError();
	if (!error) return;

	// Only handle slash (chat input) commands; skip autocomplete and other types
	if (!ctx.isChatInputCommand()) return;

	const { interaction } = ctx;

	try {
		if (interaction.replied || interaction.deferred) {
			await interaction
				.editReply({ content: ERROR_MESSAGE })
				.catch(() => interaction.followUp({ content: ERROR_MESSAGE, flags: MessageFlags.Ephemeral }));
		} else {
			await interaction.reply({ content: ERROR_MESSAGE, flags: MessageFlags.Ephemeral });
		}
	} catch (replyError) {
		Logger.error(
			`Failed to send error message to user: ${replyError instanceof Error ? replyError.message : String(replyError)}`,
		);
	}
}
