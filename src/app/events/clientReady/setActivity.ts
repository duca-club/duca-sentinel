import type { EventHandler } from "commandkit";
import { Logger } from "commandkit/logger";
import { ActivityType } from "discord.js";

const handler: EventHandler<"clientReady"> = async (client) => {
	client.user.setActivity("DUCA 👀", { type: ActivityType.Watching });
	Logger.info(`Set Activity: Watching DUCA 👀`);
};

export default handler;
