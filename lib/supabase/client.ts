import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "../flags";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client. Returns null when Supabase is not configured,
 * which lets the app run fully offline / mocked.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}