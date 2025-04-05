// The client for verify.js and calendar.js to connect to Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env');
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

export default supabase;
