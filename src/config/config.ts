import "dotenv/config";

/**
 * Retrieves an environment variable and throws an error if it's not defined.
 *
 * @param {string} name - The name of the environment variable to retrieve.
 * @throws {Error} If the environment variable is missing or empty.
 * @returns {string} The value of the environment variable.
 */
function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/**
 * Application configuration loaded from environment variables.
 * @typedef {Object} Config
 * @property {string} DISCORD_TOKEN - The token for authenticating with Discord.
 * @property {string} GUILD_ID - The Discord guild (server) ID.
 * @property {string} DEV_ROLE_ID - The role ID for bot developers or admins.
 * @property {string} MEMBER_ROLE_ID - The role ID granted to verified members.
 * @property {string} SUPABASE_URL - The URL of the Supabase instance.
 * @property {string} SUPABASE_ANON_KEY - The Supabase service role key for elevated privileges.
 */
interface Config {
    DISCORD_TOKEN: string;
    GUILD_ID: string;
    DEV_ROLE_ID: string;
    MEMBER_ROLE_ID: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

/**
 * Configuration object built at startup by reading required environment variables.
 * @type {Config}
 */
const config: Config = {
    DISCORD_TOKEN: getEnvVar("DISCORD_TOKEN"),
    GUILD_ID: getEnvVar("GUILD_ID"),
    DEV_ROLE_ID: getEnvVar("DEV_ROLE_ID"),
    MEMBER_ROLE_ID: getEnvVar("MEMBER_ROLE_ID"),
    SUPABASE_URL: getEnvVar("SUPABASE_URL"),
    SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY"),
};

export default config;
