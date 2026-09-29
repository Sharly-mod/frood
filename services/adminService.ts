import { getSupabaseBrowser } from "../lib/supabase/client";

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionStatus: string;
  premiumLifetime: boolean;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * Admin operations. Require Supabase + an authenticated admin (enforced by RLS).
 * Everything silently no-ops in mock mode (no Supabase configured).
 */
export async function listUsers(): Promise<AdminUser[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,subscription_status,premium_lifetime,is_admin,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    subscriptionStatus: row.subscription_status ?? "free",
    premiumLifetime: Boolean(row.premium_lifetime),
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
  }));
}

export async function setLifetimePremium(userId: string, value: boolean): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ premium_lifetime: value })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setAdmin(userId: string, value: boolean): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: value })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}