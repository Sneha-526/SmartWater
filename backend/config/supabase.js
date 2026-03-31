const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Admin client (bypasses RLS) — use only on server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase, supabaseAdmin };
