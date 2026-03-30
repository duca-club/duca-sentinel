import { flag } from "commandkit";

export const verifyMemberFlag = flag({
	key: "verify-member",
	description: "Controls availability of the /verify membership command",
	decide({ provider }) {
		// If no provider data is available, treat the flag as disabled by default.
		if (!provider) {
			return false;
		}

		return provider.enabled === true;
	},
});
