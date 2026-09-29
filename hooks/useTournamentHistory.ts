"use client";

import { useCallback, useEffect, useState } from "react";
import type { TournamentRecord } from "../types/user";
import { getSupabaseBrowser } from "../lib/supabase/client";
import { useSession } from "../lib/session-context";

const LOCAL_KEY = "ff:history";

interface LocalRecord {
  id: string;
  winner_restaurant_id: string;
  participant_ids: string[];
  budget: string | null;
  created_at: string;
}

function readLocal(): TournamentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalRecord[]) : [];
    return Array.isArray(parsed) ? (parsed as TournamentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(records: TournamentRecord[]): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

interface UseTournamentHistoryResult {
  records: TournamentRecord[];
  loaded: boolean;
  addRecord: (input: {
    winnerRestaurantId: string;
    participantIds: string[];
    budget: string | null;
  }) => Promise<void>;
}

export function useTournamentHistory(): UseTournamentHistoryResult {
  const { user } = useSession();
  const [records, setRecords] = useState<TournamentRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoaded(false);

    const supabase = getSupabaseBrowser();
    if (!user || !supabase) {
      setRecords(readLocal());
      setLoaded(true);
      return;
    }

    void supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!mounted) return;
        setRecords((data ?? []) as TournamentRecord[]);
        setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const addRecord = useCallback(
    async (input: { winnerRestaurantId: string; participantIds: string[]; budget: string | null }) => {
      const record: TournamentRecord = {
        id: crypto.randomUUID(),
        user_id: "local",
        winner_restaurant_id: input.winnerRestaurantId,
        participant_ids: input.participantIds,
        budget: input.budget,
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseBrowser();
      if (user && supabase) {
        const { data, error } = await supabase.from("tournaments").insert({
          winner_restaurant_id: input.winnerRestaurantId,
          participant_ids: input.participantIds,
          budget: input.budget,
        }).select().single();

        if (!error && data) {
          setRecords((prev) => [data as TournamentRecord, ...prev]);
          return;
        }
      }

      setRecords((prev) => [record, ...prev].slice(0, 50));
      writeLocal([record, ...readLocal()].slice(0, 50));
    },
    [user]
  );

  return { records, loaded, addRecord };
}