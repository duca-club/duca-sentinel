import { SupabaseFlagProvider } from "../../providers/supabaseFlagProvider.js";

/** Same key as [`newsFlag`](../../flags/newsFlag.ts); */
export const NEWS_POSTING_FEATURE_KEY = "news-posting";

const flagProvider = new SupabaseFlagProvider();

export async function isNewsPostingEnabled(): Promise<boolean> {
	const config = await flagProvider.getFlag(NEWS_POSTING_FEATURE_KEY);
	return config?.enabled === true;
}
