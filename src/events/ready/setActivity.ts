import { Client, ActivityType } from "discord.js";

/**
 * Sets the bot's activity status.
 *
 * @param client - The Discord client instance
 */
export default (client: Client): void => {
    client.user!.setActivity("DUCA 👀", { type: ActivityType.Watching });
};
