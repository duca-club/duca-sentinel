import type { Client } from "discord.js";
import logger from "../../utils/logger.js";

/**
 * Logs a successful Discord client login event at debug level.
 *
 * @param {Client<true>} client - The Discord client instance.
 */
export default function log(client: Client<true>) {
    logger(`Successfully logged in`, "debug", client.user.tag);
}
