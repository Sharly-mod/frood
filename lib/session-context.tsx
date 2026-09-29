"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase/client";
import { DEV_PREMIUM } from "./flags";
import { isSimPremiumActive } from "./dev-subscription";
import type { Profile } from "../types/user";

interface SessionContextValue {
  user: User | null;
  profile: Profile | null;
  isPremium: boolean;
  isAdmin: boolean;
  isSupabaseEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function defaultProfile(user: User): Profile {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      (user.user_metadata?.displayName as string | undefined) ??
      user.email?.split("@")[0] ??
      "Mangeur",
    avatarUrl: (user.user_metadata?.avatar_url as string | null) ?? null,
    subscriptionStatus: "free",
    isAdmin: false,
    premiumLifetime: false,
    createdAt: new Date().toISOString(),
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setProfile(defaultProfile(nextUser));
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", nextUser.id)
      .maybeSingle();

    if (data) {
      setProfile({
        id: data.id,
        email: data.email ?? nextUser.email ?? "",
        displayName: data.display_name ?? nextUser.email?.split("@")[0] ?? "Mangeur",
        avatarUrl: data.avatar_url,
        subscriptionStatus: data.subscription_status ?? "free",
        isAdmin: Boolean(data.is_admin),
        premiumLifetime: Boolean(data.premium_lifetime),
        createdAt: data.created_at,
      });
    } else {
      setProfile(defaultProfile(nextUser));
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      return;
    }
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session?.user ?? null);
  }, [loadProfile]);

  const value = useMemo<SessionContextValue>(() => {
    const simPremium = isSimPremiumActive();
    const isPremium =
      DEV_PREMIUM ||
      simPremium ||
      profile?.premiumLifetime ||
      profile?.subscriptionStatus === "premium" ||
      profile?.subscriptionStatus === "trialing";

    return {
      user,
      profile,
      isPremium,
      isAdmin: Boolean(profile?.isAdmin),
      isSupabaseEnabled: Boolean(getSupabaseBrowser()),
      loading,
      refresh,
    };
  }, [user, profile, loading, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}