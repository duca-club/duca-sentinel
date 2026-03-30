import { setFlagProvider } from "commandkit";
import { Client } from "discord.js";
import { SupabaseFlagProvider } from "./providers/supabaseFlagProvider.js";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

requireEnv("SUPABASE_URL");
requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireEnv("MEMBER_ROLE_ID");

const client = new Client({
	intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

// Configure global feature flag provider
setFlagProvider(new SupabaseFlagProvider());

export default client;
