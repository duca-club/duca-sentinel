import { Logger } from "commandkit/logger";
import { supabase } from "../supabaseClient.ts";

export type NewsPostSource = "digest" | "alert";

export async function fetchPostedKeys(keys: readonly string[]): Promise<Set<string>> {
	if (keys.length === 0) {
		return new Set();
	}

	const { data, error } = await supabase
		.from("news_posted_items")
		.select("article_key")
		.in("article_key", [...keys]);

	if (error) {
		Logger.error(`[news/Dedupe] fetchPostedKeys failed: ${String(error)}`);
		throw error;
	}

	const set = new Set<string>();
	for (const row of data ?? []) {
		if (typeof row.article_key === "string") {
			set.add(row.article_key);
		}
	}
	return set;
}

/**
 * Atomically claims an article key (dedupe gate).
 * Returns true only for the first caller across all tasks/processes.
 */
export async function claimPosted(articleKey: string, source: NewsPostSource): Promise<boolean> {
	const { error } = await supabase.from("news_posted_items").insert({
		article_key: articleKey,
		source,
	});

	if (error) {
		// Unique violation: already recorded
		if (error.code === "23505") {
			return false;
		}
		Logger.error(`[news/Dedupe] Failed to mark post: ${String(error)}`);
		throw error;
	}
	return true;
}

/** Rollback if claimed but failed to post. */
export async function unclaimPosted(articleKey: string): Promise<void> {
	const { error } = await supabase.from("news_posted_items").delete().eq("article_key", articleKey);
	if (error) {
		Logger.error(`[news/Dedupe] Failed to unclaim posted item: ${String(error)}`);
	}
}
