"use client";

import { useCallback, useEffect, useState } from "react";
import type { Restaurant } from "../types/restaurant";
import { getSupabaseBrowser } from "../lib/supabase/client";
import { useSession } from "../lib/session-context";
import { canUseFeature } from "../lib/feature-flags";

const LOCAL_KEY = "ff:favorites";

function readLocal(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

interface UseFavoritesResult {
  favorites: string[];
  loaded: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (restaurant: Restaurant) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
}

export function useFavorites(): UseFavoritesResult {
  const { user, isPremium } = useSession();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoaded(false);

    const supabase = getSupabaseBrowser();
    if (!user || !supabase) {
      setFavorites(readLocal());
      setLoaded(true);
      return;
    }

    void supabase
      .from("favorites")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!mounted) return;
        setFavorites((data ?? []).map((row) => row.restaurant_id as string));
        setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      writeLocal(favorites);
    }
  }, [favorites, user]);

  const favoriteLimitReached = useCallback((): boolean => {
    if (canUseFeature("unlimitedFavorites", isPremium)) {
      return false;
    }
    return favorites.length >= 20;
  }, [favorites.length, isPremium]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    async (restaurant: Restaurant) => {
      const { id } = restaurant;
      const has = favorites.includes(id);

      let next: string[];
      if (has) {
        next = favorites.filter((f) => f !== id);
      } else {
        if (favoriteLimitReached()) {
          return;
        }
        next = [...favorites, id];
      }
      setFavorites(next);

      const supabase = getSupabaseBrowser();
      if (user && supabase) {
        if (has) {
          await supabase.from("favorites").delete().eq("user_id", user.id).eq("restaurant_id", id);
        } else {
          await supabase.from("favorites").insert({ user_id: user.id, restaurant_id: id });
        }
      }
    },
    [favorites, user, favoriteLimitReached]
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      setFavorites((prev) => prev.filter((f) => f !== id));
      const supabase = getSupabaseBrowser();
      if (user && supabase) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("restaurant_id", id);
      }
    },
    [user]
  );

  return { favorites, loaded, isFavorite, toggleFavorite, removeFavorite };
}