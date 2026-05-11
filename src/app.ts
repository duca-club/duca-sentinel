import { setFlagProvider } from "commandkit";
import { Client } from "discord.js";
import { SupabaseFlagProvider } from "./providers/supabaseFlagProvider.js";

const client = new Client({
	intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

// Configure global feature flag provider
setFlagProvider(new SupabaseFlagProvider());

export default client;
