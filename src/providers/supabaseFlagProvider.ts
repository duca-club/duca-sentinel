import { Logger } from "commandkit/logger";
import { supabaseClient } from "../lib/supabaseClient.js";

interface FeatureFlagRow {
	enabled: boolean;
	feature: string;
}

interface SupabaseFlagConfiguration {
	enabled: boolean;
}

export class SupabaseFlagProvider {
	async getFlag(key: string): Promise<SupabaseFlagConfiguration | null> {
		const { data, error } = await supabaseClient
			.from("feature_flags")
			.select("feature, enabled")
			.eq("feature", key)
			.maybeSingle<FeatureFlagRow>();

		if (error) {
			Logger.error(`[featureFlags] getFlag(${key}) failed error=${String(error)}`);
			return null;
		}

		if (!data) {
			return null;
		}

		return {
			enabled: data.enabled,
		};
	}

	async hasFlag(key: string): Promise<boolean> {
		const { data, error } = await supabaseClient
			.from("feature_flags")
			.select("feature")
			.eq("feature", key)
			.maybeSingle<{ feature: string }>();

		if (error) {
			Logger.error(`[featureFlags] hasFlag(${key}) failed error=${String(error)}`);
			return false;
		}

		return Boolean(data);
	}
}
