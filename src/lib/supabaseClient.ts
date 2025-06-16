import config from "../config/config.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY: SUPABASE_SERVICE_ROLE } = config;

/**
 * Represents a member who has been verified via Discord.
 */
interface VerifiedMember {
    discord_id: number;
    email: string;
    full_name: string;
    discord_username: string;
    verified_at: string;
}

/**
 * Represents a DUCA member record from the membership list.
 */
interface MemberList {
    full_name: string;
    student_id: string;
    email: string;
    campus: string;
    first_subscription_date: string;
    last_paid_date: string;
    end_date: string;
    faculty: string;
    new_renewal: string;
    payment_option_type: string;
}

/**
 * Type mapping for Supabase tables and their row, insert, and update shapes.
 */
interface Database {
    /** Table of verified Discord members */
    verified_members: {
        /** Row shape for verified_members */
        Row: VerifiedMember;
        /** Fields required when inserting a new verified member */
        Insert: Omit<VerifiedMember, "verified_at"> & { verified_at?: string };
        /** Fields allowed when updating a verified member */
        Update: Partial<VerifiedMember>;
    };
    /** Table of DUCA membership list details */
    member_list: {
        Row: MemberList;
        /** Fields required when inserting a member list record */
        Insert: Omit<MemberList, never>;
        /** Fields allowed when updating a member list record */
        Update: Partial<MemberList>;
    };
}

/**
 * Supabase client instance configured with service-role credentials.
 * Provides typed access to the DUCA database.
 *
 * @type {SupabaseClient<Database>}
 */
const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default supabase;
