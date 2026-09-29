"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { getRestaurantsByIds } from "@/services/restaurantService";
import { useFavorites } from "@/hooks/useFavorites";
import { useTournamentLaunch } from "@/hooks/useTournamentLaunch";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { LaunchBar } from "@/components/restaurants/launch-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session-context";
import { canUseFeature } from "@/lib/feature-flags";

export function FavoritesView() {
  const { user, isPremium } = useSession();
  const { favorites, loaded, toggleFavorite } = useFavorites();
  const {
    selectedIds,
    maxAllowed,
    toggleSelect,
    clearSelection,
    launch,
    limitDialogOpen,
    setLimitDialogOpen,
    quotaDialogOpen,
    setQuotaDialogOpen,
  } = useTournamentLaunch();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingRestaurants(true);
    if (!loaded) return;

    if (favorites.length === 0) {
      setRestaurants([]);
      setLoadingRestaurants(false);
      return;
    }

    void getRestaurantsByIds(favorites.slice().sort()).then((found) => {
      if (!mounted) return;
      setRestaurants(found);
      setLoadingRestaurants(false);
    });

    return () => {
      mounted = false;
    };
  }, [favorites, loaded]);

  const unlimitedFavorites = canUseFeature("unlimitedFavorites", isPremium);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 md:pb-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight md:text-3xl">
          <Heart className="h-7 w-7 fill-red-500 text-red-500" aria-hidden="true" />
          Favoris
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user ? "Tes restaurants sauvegardés, synchronisés sur ton compte." : "Sauvegardés sur cet appareil."}
        </p>
      </div>

      {!unlimitedFavorites ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Free : garde jusqu'à 20 favoris.
          </p>
          <Link href="/premium">
            <Button size="sm" variant="soft">
              Premium
            </Button>
          </Link>
        </div>
      ) : null}

      {!loaded || loadingRestaurants ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <EmptyState
          emoji="🫶"
          title="Aucun favori pour l'instant"
          description="Touche le cœur ❤️ sur un restaurant pour le retrouver ici."
          action={
            <Link href="/">
              <Button size="lg">Trouver des restaurants</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              isSelected={selectedIds.includes(restaurant.id)}
              isFavorite={true}
              onToggleSelect={(r) => toggleSelect(r.id)}
              onToggleFavorite={(r) => void toggleFavorite(r)}
              selectLabel="Ajouter au tournoi"
            />
          ))}
        </div>
      )}

      {selectedIds.length > 0 ? (
        <LaunchBar count={selectedIds.length} onLaunch={launch} onClear={clearSelection} />
      ) : null}

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
              Continuer avec {maxAllowed}
            </Button>
            <Link href="/premium" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Découvrir Premium</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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