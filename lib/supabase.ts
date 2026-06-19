import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Service role bypasses RLS — used only in server actions (never exposed to browser)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side client for use in Server Actions.
 * Uses service role key if available (bypasses RLS), otherwise falls back to anon key.
 */
export function createServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey ?? supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Browser-side client for client components (read-only is recommended).
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}
