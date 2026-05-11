import type { Client } from "commandkit";
import { Logger } from "commandkit/logger";
import { type MessageCreateOptions, MessageFlags, ThreadAutoArchiveDuration } from "discord.js";
import envConfig from "../envConfig.ts";

export type NewsThreadType = "digest" | "alert";

function formatThreadTimestamp(now: Date): string {
	const timeZone = envConfig.NEWS_TIMEZONE;
	const parts = new Intl.DateTimeFormat("en-AU", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	}).formatToParts(now);

	const year = parts.find((p) => p.type === "year")?.value ?? "0000";
	const month = parts.find((p) => p.type === "month")?.value ?? "00";
	const day = parts.find((p) => p.type === "day")?.value ?? "00";
	const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
	const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
	const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toUpperCase();

	return `${hour}:${minute} ${dayPeriod} | ${day}/${month}/${year}`;
}

function threadLabel(type: NewsThreadType): "Daily Digest" | "Critical Alert" {
	return type === "alert" ? "Critical Alert" : "Daily Digest";
}

export async function postNewsWithDiscussionThread(
	client: Client,
	container: NonNullable<MessageCreateOptions["components"]>[number],
	type: NewsThreadType,
): Promise<void> {
	const targetChannelID = envConfig.NEWS_CHANNEL_ID;

	const channel = await client.channels.fetch(targetChannelID);

	if (!channel?.isTextBased() || !channel.isSendable()) {
		Logger.error(`[news/post] Channel ${targetChannelID} is not text-based, not sendable, or was not found`);
		return;
	}

	const message = await channel.send({
		components: [container] as MessageCreateOptions["components"],
		flags: MessageFlags.IsComponentsV2,
	});

	const now = new Date();
	const label = threadLabel(type);
	const timestamp = formatThreadTimestamp(now);

	await message.startThread({
		name: `${label} @ ${timestamp}`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
		reason: `Cyber news ${label.toLowerCase()} discussion thread`,
	});
}
