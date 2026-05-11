/**
 * Retrieves an environment variable and throws an error if it's not defined.
 *
 * @param {string} name Name of the environment variable to retrieve.
 * @throws {Error} If the environment variable is missing or empty.
 * @returns {string} Value of the environment variable.
 */
function getEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

/**
 * Retrieves an optional environment variable.
 *
 * @param {string} name Name of the environment variable to retrieve.
 * @returns {string | undefined} Value of the environment variable or undefined if not set.
 */
function getOptionalEnvVar(name: string): string | undefined {
	return process.env[name];
}

interface envConfig {
	DISCORD_TOKEN: string;
	MEMBER_ROLE_ID: string;
	NEWS_ALERT_CRON: string;
	NEWS_ALERT_KEYWORDS: string;
	NEWS_CHANNEL_ID: string;
	NEWS_DIGEST_CRON: string;
	NEWS_FEED_URL: string;
	NEWS_TIMEZONE: string;
	SUPABASE_SECRET_KEY: string;
	SUPABASE_URL: string;
}

/**
 * Configuration object built at startup by reading required and optional environment variables.
 * @type {envConfig}
 */
const envConfig: envConfig = {
	DISCORD_TOKEN: getEnvVar("DISCORD_TOKEN"),
	MEMBER_ROLE_ID: getEnvVar("MEMBER_ROLE_ID"),
	SUPABASE_URL: getEnvVar("SUPABASE_URL"),
	SUPABASE_SECRET_KEY: getEnvVar("SUPABASE_SECRET_KEY"),
	NEWS_CHANNEL_ID: getEnvVar("NEWS_CHANNEL_ID"),
	NEWS_FEED_URL: "https://feeds.feedburner.com/TheHackersNews",
	NEWS_TIMEZONE: getOptionalEnvVar("NEWS_TIMEZONE") ?? "Australia/Sydney",
	NEWS_DIGEST_CRON: getOptionalEnvVar("NEWS_DIGEST_CRON") ?? "0 9,17 * * *",
	NEWS_ALERT_CRON: getOptionalEnvVar("NEWS_ALERT_CRON") ?? "0 * * * *",
	NEWS_ALERT_KEYWORDS: getOptionalEnvVar("NEWS_ALERT_KEYWORDS") ?? "critical,zero-day,zero day",
};

export default envConfig;
