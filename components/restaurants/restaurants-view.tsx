"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Budget, RestaurantFilters } from "@/types/filters";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useFavorites } from "@/hooks/useFavorites";
import { useTournamentLaunch } from "@/hooks/useTournamentLaunch";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { LaunchBar } from "@/components/restaurants/launch-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCuisineLabel } from "@/data/cuisines";

const BUDGET_LABELS: Record<Budget, string> = {
  "<10": "Moins de 10 €",
  "10-15": "10–15 €",
  "15-25": "15–25 €",
  "25-40": "25–40 €",
  any: "Peu importe",
};

const BUDGETS: Budget[] = ["<10", "10-15", "15-25", "25-40", "any"];

function CardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export function RestaurantsView() {
  const searchParams = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavorites();
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

  const filters = useMemo<RestaurantFilters>(() => {
    const budgetRaw = searchParams.get("budget") as Budget | null;
    const budget: Budget = BUDGETS.includes(budgetRaw as Budget) ? (budgetRaw as Budget) : "any";
    const distance = Math.min(Math.max(Number(searchParams.get("distance")) || 5, 1), 50);
    const cuisineRaw = searchParams.get("cuisine");
    const cuisine = cuisineRaw && cuisineRaw !== "all" ? (cuisineRaw as RestaurantFilters["cuisine"]) : "all";
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const location =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, label: searchParams.get("label") ?? undefined }
        : null;

    return { budget, maxDistanceKm: distance, cuisine, location };
  }, [searchParams]);

  const { restaurants, loading, error, refetch } = useRestaurants(filters);

  const locationLabel = filters.location?.label ?? "Paris";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 md:pb-10">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>
        <h1 className="font-display text-2xl font-black tracking-tight md:text-3xl">Restaurants pour toi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Recherche en cours..." : `${restaurants.length} restaurant${restaurants.length > 1 ? "s" : ""} · ${locationLabel}`}
          {" · "}{BUDGET_LABELS[filters.budget]}
          {filters.cuisine !== "all" ? ` · ${getCuisineLabel(filters.cuisine)}` : ""}
          {" · "}{filters.maxDistanceKm} km
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Impossible de charger les restaurants"
          description="Le service de restaurants est momentanément indisponible. Réessaie dans un instant."
          retry={refetch}
        />
      ) : restaurants.length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="Aucun restaurant trouvé"
          description="Essaie d'élargir ton budget, tes distances ou tes cuisines."
          action={
            <Link href="/">
              <Button size="lg">Modifier mes critères</Button>
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
              isFavorite={isFavorite(restaurant.id)}
              onToggleSelect={(r) => toggleSelect(r.id)}
              onToggleFavorite={(r) => void toggleFavorite(r)}
            />
          ))}
        </div>
      )}

      {selectedIds.length > 0 ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">
            {selectedIds.length} restaurant{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""} pour le tournoi
          </p>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Réinitialiser
          </Button>
        </div>
      ) : null}

      {/* Floating launch bar */}
      {selectedIds.length > 0 ? (
        <LaunchBar count={selectedIds.length} onLaunch={launch} onClear={clearSelection} />
      ) : null}

      {/* Premium / selection limit dialog */}
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

      {/* signifier that launch is available */}
      {loading || error || restaurants.length === 0 ? null : selectedIds.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Sélectionne au moins 2 restaurants pour lancer le tournoi 👇
        </p>
      ) : null}
    </div>
  );
}