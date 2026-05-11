import { flag } from "commandkit";
import { NEWS_POSTING_FEATURE_KEY } from "../lib/news/newsGate.ts";

export const newsFlag = flag({
	key: NEWS_POSTING_FEATURE_KEY,
	description: "Enables scheduled news digest and keyword alert posts",
	decide({ provider }) {
		if (!provider) {
			return false;
		}

		return provider.enabled === true;
	},
});
