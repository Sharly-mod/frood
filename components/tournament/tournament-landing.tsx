"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, X, Clock } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { getRestaurantsByIds } from "@/services/restaurantService";
import { useTournamentLaunch } from "@/hooks/useTournamentLaunch";
import { useTournamentHistory } from "@/hooks/useTournamentHistory";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { RestaurantImage } from "@/components/ui/restaurant-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatPrice } from "@/lib/utils";
import { getCuisineEmoji, getCuisineLabel } from "@/data/cuisines";

function SelectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function TournamentLanding() {
  const {
    selectedIds,
    maxAllowed,
    clearSelection,
    launch,
    limitDialogOpen,
    setLimitDialogOpen,
    quotaDialogOpen,
    setQuotaDialogOpen,
  } = useTournamentLaunch();

  const [selected, setSelected] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(selectedIds.length > 0);

  useEffect(() => {
    let mounted = true;
    if (selectedIds.length === 0) {
      setSelected([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getRestaurantsByIds(selectedIds).then((found) => {
      if (!mounted) return;
      setSelected(found);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [selectedIds]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight md:text-3xl">
          <Trophy className="h-7 w-7 text-primary" aria-hidden="true" />
          Ton tournoi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ta sélection est synchronisée avec la liste des restaurants.
        </p>
      </div>

      {/* Selection */}
      {loading ? (
        <SelectionSkeleton />
      ) : selected.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Aucun restaurant sélectionné"
          description="Ajoute des restaurants depuis la liste pour préparer ton tournoi."
          action={
            <Link href="/" className="w-full">
              <Button size="lg" className="w-full">
                Choisir des restaurants
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {selected.length} restaurant{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}
            </p>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="mr-1 h-4 w-4" aria-hidden="true" />
              Tout désélectionner
            </Button>
          </div>

          <ul className="space-y-2">
            {selected.map((restaurant) => (
              <li
                key={restaurant.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <RestaurantImage
                    src={restaurant.image}
                    name={restaurant.name}
                    address={restaurant.address}
                    alt={`Photo de ${restaurant.name}`}
                    cuisine={restaurant.cuisine}
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">
                    {getCuisineEmoji(restaurant.cuisine)} {restaurant.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getCuisineLabel(restaurant.cuisine)} · ~{formatPrice(restaurant.averagePrice)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-5 w-full" onClick={launch} disabled={selected.length < 2}>
            <Trophy className="mr-2 h-5 w-5" aria-hidden="true" />
            Lancer le tournoi ({selected.length})
          </Button>
          {selected.length < 2 ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Il te faut au moins 2 restaurants pour lancer le tournoi.
            </p>
          ) : null}
        </>
      )}

      {/* History */}
      <TournamentHistoryPreview />

      {/* Selection limit dialog */}
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Les tournois jusqu'à {maxAllowed} restaurants sont gratuits.</DialogTitle>
            <DialogDescription>
              Passe à Premium pour organiser des tournois jusqu'à 32 restaurants.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialogOpen(false)}>
              Fermer
            </Button>
            <Link href="/premium" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto" onClick={() => setLimitDialogOpen(false)}>
                Découvrir Premium
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily quota dialog */}
      <Dialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu as utilisé tes 3 tournois gratuits aujourd'hui.</DialogTitle>
            <DialogDescription>Reviens demain ou passe à Premium pour continuer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaDialogOpen(false)}>
              Fermer
            </Button>
            <Link href="/premium" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto" onClick={() => setQuotaDialogOpen(false)}>
                Voir Premium
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TournamentHistoryPreview() {
  const { records, loaded } = useTournamentHistory();
  const [winnersById, setWinnersById] = useState<Map<string, Restaurant>>(new Map());
  const { user } = useSession();

  const winnerIds = useMemo(() => records.map((record) => record.winner_restaurant_id), [records]);

  useEffect(() => {
    let mounted = true;
    if (winnerIds.length === 0) return;
    void getRestaurantsByIds(winnerIds).then((found) => {
      if (!mounted) return;
      setWinnersById((prev) => {
        const next = new Map(prev);
        for (const restaurant of found) next.set(restaurant.id, restaurant);
        return next;
      });
    });
    return () => {
      mounted = false;
    };
  }, [winnerIds]);

  if (!loaded) {
    return (
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-black tracking-tight md:text-2xl">
        <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
        Tes derniers tournois
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {user
          ? "Ton historique est synchronisé sur ton compte."
          : "Connecte-toi pour synchroniser ton historique partout."}
      </p>

      <ul className="mt-4 space-y-3">
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
    </div>
  );
}