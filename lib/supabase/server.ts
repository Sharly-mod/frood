import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "../flags";

/**
 * Server Supabase client backed by cookies. Returns null when Supabase is not configured.
 * Note: params/cookies are async in Next.js 16 — callers must await this function.
 */
export async function getSupabaseServer() {
  if (!SUPABASE_ENABLED) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
}