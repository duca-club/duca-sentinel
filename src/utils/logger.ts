import colors from "colors";
import moment from "moment";

/**
 * Log levels supported by the logger utility.
 */
export type LogType = "info" | "warn" | "error" | "debug" | "success";

/**
 * Format configuration for each log level, including label and color function.
 */
interface LogFormat {
    /** Uppercase label for the log level */
    label: string;
    /** Function to colorize the log message */
    color: (text: string) => string;
}

/**
 * Mapping from log type to its format configuration.
 */
const logFormats: Record<LogType, LogFormat> = {
    info: { label: "INFO", color: colors.cyan },
    warn: { label: "WARN", color: colors.yellow },
    error: { label: "ERROR", color: colors.red },
    debug: { label: "DEBUG", color: colors.blue },
    success: { label: "SUCCESS", color: colors.green },
};

/**
 * Logs a message with a timestamp, level label, and optional Discord user context.
 * The final message is printed to stdout with colorization based on the log level.
 *
 * @param content - The text content to log.
 * @param type    - The log level (info, warn, error, debug, success). Defaults to 'debug'.
 * @param discordUser - Optional Discord username (e.g., "User#1234") to attribute the log entry.
 */
const logger = (content: string, type: LogType = "debug", discordUser?: string): void => {
    // Current timestamp formatted as HH:mm:ss DD-MM-YYYY
    const timestamp = moment().format("HH:mm:ss DD-MM-YYYY");

    // Retrieve label and color for the specified log type
    const { label, color } = logFormats[type];

    // If a Discord user is provided, prepend it to the log message
    const user = discordUser ? ` [${discordUser}]` : "";

    // Build the final log message using a consistent pipe-separated format
    const logMessage = `[${timestamp}] [${label}]${user} ${content}`;

    // Output to console with colorization
    console.log(color(logMessage));
};

export default logger;
