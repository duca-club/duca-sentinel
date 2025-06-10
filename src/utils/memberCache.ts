import supabase from "../lib/supabaseClient.js";
import logger from "./logger.js";
import cron from "node-cron";

/**
 * Caches DUCA membership data (emails and full names) in-memory
 * and refreshes on startup + weekly via a cron schedule.
 */
class MemberCache {
    /** Set of lowercase member emails for quick existence checks */
    private emails = new Set<string>();
    /** Map from lowercase email to full name */
    private nameMap = new Map<string, string>();
    /** Timestamp of the last successful refresh (ms since epoch) */
    private lastRefresh = 0;

    /** Cache refresh interval (1 week in milliseconds) */
    private readonly refreshIntervalMs = 7 * 24 * 60 * 60 * 1000;

    /**
     * Initializes the cache: loads data immediately and schedules weekly refresh.
     */
    constructor() {
        // Load cache on startup
        this.refresh().catch((error) => logger("[membership-cache] " + String(error), "error"));

        // Schedule a weekly refresh every Friday at 20:00 Australia/Melbourne time
        cron.schedule(
            "0 20 * * 5",
            () => {
                this.refresh()
                    .then(() => logger("Scheduled membership cache refresh complete", "info"))
                    .catch((error) => logger("[membership-cache] " + String(error), "error"));
            },
            { timezone: "Australia/Melbourne" },
        );
    }

    /**
     * Fetches fresh member data from Supabase if the cache is stale,
     * then rebuilds the in-memory email set and name map.
     *
     * @throws If the database query returns an error.
     */
    public async refresh(): Promise<void> {
        const now = Date.now();
        // Skip refresh if interval hasn't elapsed
        if (now - this.lastRefresh < this.refreshIntervalMs) {
            logger("Membership cache refreshed recently, skipping...", "info");
            return;
        }

        const { data: members, error } = await supabase.from("member_list").select("full_name, email");

        if (error) throw error;

        // Clear and rebuild caches
        this.emails.clear();
        this.nameMap.clear();
        for (const member of members) {
            const emailLower = member.email.trim().toLowerCase();
            this.emails.add(emailLower);
            this.nameMap.set(emailLower, member.full_name);
        }

        this.lastRefresh = now;
        logger("Membership cache refreshed", "info");
    }

    /**
     * Checks if an email is present in the cache.
     *
     * @param email - The member email to test.
     * @returns True if the email exists in cache; false otherwise.
     */
    public has(email: string): boolean {
        return this.emails.has(email.trim().toLowerCase());
    }

    /**
     * Retrieves the cached full name for a given email.
     *
     * @param email - The member email whose name to fetch.
     * @returns The full name if found; otherwise undefined.
     */
    public getFullName(email: string): string {
        return String(this.nameMap.get(email.trim().toLowerCase()));
    }
}

/**
 * Singleton instance of the MemberCache.
 */
export default new MemberCache();
