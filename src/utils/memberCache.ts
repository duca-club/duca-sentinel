import { isSupabaseAvailable, getSupabaseClient } from "../lib/supabaseClient.js";
import logger from "./logger.js";
import cron from "node-cron";

/**
 * Caches DUCA membership data (emails and full names) in-memory
 * and refreshes on startup + weekly via a cron schedule.
 * Falls back to empty cache when Supabase is not available.
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
        this.refresh().catch((error) => logger("[memberCache] " + String(error), "error"));

        // Schedule a weekly refresh every Friday at 20:00 Australia/Melbourne time
        // Only schedule if Supabase is available
        if (isSupabaseAvailable()) {
            cron.schedule(
                "0 20 * * 5",
                () => {
                    this.refresh()
                        .then(() => logger("[memberCache] Scheduled refresh complete", "info"))
                        .catch((error) => logger("[membership cache] " + String(error), "error"));
                },
                { timezone: "Australia/Melbourne" },
            );
        } else {
            logger("[memberCache] Scheduled refresh disabled", "warn");
        }
    }

    /**
     * Fetches fresh member data from Supabase if the cache is stale,
     * then rebuilds the in-memory email set and name map.
     * Falls back to empty cache when Supabase is not available.
     *
     * @throws If the database query returns an error (only when Supabase is available).
     */
    public async refresh(): Promise<void> {
        const now = Date.now();
        // Skip refresh if interval hasn't elapsed
        if (now - this.lastRefresh < this.refreshIntervalMs) {
            logger("[memberCache] Refreshed recently, skipping...", "info");
            return;
        }

        // Check if Supabase is available
        if (!isSupabaseAvailable()) {
            logger(
                "[memberCache] Caching inactive as Supabase is disabled. Enable Supabase to restore functionality",
                "warn",
            );
            this.emails.clear();
            this.nameMap.clear();
            this.lastRefresh = now;
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            logger(
                "[memberCache] Caching inactive as Supabase client is unavailable. Enable Supabase to restore functionality",
                "warn",
            );
            this.emails.clear();
            this.nameMap.clear();
            this.lastRefresh = now;
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
        logger("[membership cache] Refreshed successfully", "info");
    }

    /**
     * Checks if an email exists in the membership cache.
     * @param {string} email - The email to check (case-insensitive).
     * @returns {boolean} True if the email is in the cache.
     */
    public has(email: string): boolean {
        return this.emails.has(email.trim().toLowerCase());
    }

    /**
     * Gets the full name associated with an email.
     * @param {string} email - The email to look up (case-insensitive).
     * @returns {string | undefined} The full name or undefined if not found.
     */
    public getFullName(email: string): string | undefined {
        return this.nameMap.get(email.trim().toLowerCase());
    }

    /**
     * Gets the total number of cached members.
     * @returns {number} The number of members in the cache.
     */
    public get size(): number {
        return this.emails.size;
    }
}

export default new MemberCache();
