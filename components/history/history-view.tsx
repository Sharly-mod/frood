"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { getRestaurantsByIds } from "@/services/restaurantService";
import { useTournamentHistory } from "@/hooks/useTournamentHistory";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { RestaurantImage } from "@/components/ui/restaurant-image";
import { formatDate } from "@/lib/utils";
import { getCuisineEmoji } from "@/data/cuisines";

export function HistoryView() {
  const { user } = useSession();
  const { records, loaded } = useTournamentHistory();
  const [winnersById, setWinnersById] = useState<Map<string, Restaurant>>(new Map());

  const winnerIds = useMemo(() => records.map((r) => r.winner_restaurant_id), [records]);

  useEffect(() => {
    let mounted = true;
    if (winnerIds.length === 0) return;
    void getRestaurantsByIds(winnerIds).then((found) => {
      if (!mounted) return;
      setWinnersById((prev) => {
        const next = new Map(prev);
        for (const r of found) next.set(r.id, r);
        return next;
      });
    });
    return () => {
      mounted = false;
    };
  }, [winnerIds]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight md:text-3xl">
          <Clock className="h-7 w-7 text-primary" aria-hidden="true" />
          Tes derniers tournois
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user
            ? "Ton historique est synchronisé sur ton compte."
            : "Connecte-toi pour synchroniser ton historique partout."}
        </p>
      </div>

      {!loaded ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          emoji="🏟️"
          title="Aucun tournoi pour l'instant"
          description="Lance ton premier tournoi, on gardera le gagnant ici."
          action={
            <Link href="/">
              <Button size="lg">Lancer un tournoi</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {records.map((record) => {
            const winner = winnersById.get(record.winner_restaurant_id);
            return (
              <li
                key={record.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  {winner ? (
                    <RestaurantImage
                      src={winner.image}
                      name={winner.name}
                      address={winner.address}
                      alt={`Photo de ${winner.name}`}
                      cuisine={winner.cuisine}
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xl">
                      🏆
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">
                    {winner ? (
                      <>
                        {getCuisineEmoji(winner.cuisine)} {winner.name}
                      </>
                    ) : (
                      "Restaurant"
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.participant_ids.length} restaurants
                    {record.budget ? ` · ${record.budget} max` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {formatDate(record.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}