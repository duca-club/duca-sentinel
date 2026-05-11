import { createClient } from "@supabase/supabase-js";
import envConfig from "./envConfig.ts";

const supabaseURL = envConfig.SUPABASE_URL;
const supabaseSecretKey = envConfig.SUPABASE_SECRET_KEY;

export const supabase = createClient(supabaseURL, supabaseSecretKey);
