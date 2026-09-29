"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { LocationService } from "@/services/locationService";
import { SELECTABLE_CUISINES } from "@/data/cuisines";
import type { Cuisine as CuisineValue } from "@/types/restaurant";
import type { Budget as BudgetValue } from "@/types/filters";

const BUDGET_OPTIONS: { value: BudgetValue; label: string }[] = [
  { value: "<10", label: "Moins de 10 €" },
  { value: "10-15", label: "10–15 €" },
  { value: "15-25", label: "15–25 €" },
  { value: "25-40", label: "25–40 €" },
  { value: "any", label: "Peu importe" },
];

const DISTANCE_OPTIONS = [1, 3, 5, 10];

export function SearchForm() {
  const router = useRouter();
  const { status, coordinates, request, geocode } = useLocation();

  const [budget, setBudget] = useState<BudgetValue>("any");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(5);
  const [cuisine, setCuisine] = useState<CuisineValue | "all">("all");
  const [city, setCity] = useState("");
  const [cityError, setCityError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [showCityInput, setShowCityInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locationResolved = coordinates !== null;

  const handleGeocode = async () => {
    if (!city.trim()) {
      setShowCityInput(true);
      return;
    }
    setCityError(null);
    const coords = await geocode(city);
    if (!coords) {
      setCityError("Lieu introuvable. Essaie une autre orthographe ou une ville voisine.");
    } else {
      setShowCityInput(false);
    }
  };

  const handleUseMyPosition = async () => {
    if (locating) return;
    setGeoError(null);
    setLocating(true);
    try {
      const result = await request();
      if (result.status === "granted" && result.coordinates) {
        setShowCityInput(false);
        setCityError(null);
      } else if (result.status === "denied") {
        setGeoError(
          "Position refusée. Autorise la géolocalisation (cadenas dans la barre d'adresse du navigateur), puis réessaie — ou entre une ville."
        );
      } else {
        setGeoError("Impossible de te localiser. Entre une ville ou réessaie dans un instant.");
      }
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    let resolvedCoords = coordinates;
    if (!resolvedCoords && city.trim()) {
      resolvedCoords = await geocode(city);
    }
    if (!resolvedCoords) {
      resolvedCoords = LocationService.getDefaultLocation();
    }

    const params = new URLSearchParams({
      budget,
      distance: String(maxDistanceKm),
      cuisine,
      lat: String(resolvedCoords.lat),
      lng: String(resolvedCoords.lng),
      label: resolvedCoords.label ?? "Paris",
    });

    setSubmitting(false);
    router.push(`/restaurants?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      {/* Location */}
      <section aria-labelledby="location-title">
        <h2 id="location-title" className="mb-3 font-display text-lg font-bold">
          Ta position
        </h2>

        {locationResolved && !showCityInput ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {coordinates.label ?? "Position détectée"}
            </span>
            <button
              type="button"
              onClick={() => setShowCityInput(true)}
              className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline cursor-pointer"
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
            {status !== "granted" ? (
              <p className="text-sm text-muted-foreground">Entre une ville ou un quartier pour continuer.</p>
            ) : null}
            <div className="flex gap-2">
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleGeocode();
                  }
                }}
                placeholder="📍 Ville ou quartier…"
                aria-label="Ville ou quartier"
              />
              <Button variant="outline" onClick={() => void handleGeocode()} aria-label="Valider la ville">
                OK
              </Button>
            </div>
            {cityError ? <p className="text-sm text-destructive" role="alert">{cityError}</p> : null}
            <button
              type="button"
              onClick={() => void handleUseMyPosition()}
              disabled={locating}
              className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer hover:underline disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {locating ? "Localisation en cours…" : "Utiliser ma position"}
            </button>
            {geoError ? <p className="text-sm text-destructive" role="alert">{geoError}</p> : null}
          </div>
        )}
      </section>

      {/* Budget */}
      <section aria-labelledby="budget-title">
        <h2 id="budget-title" className="mb-3 font-display text-lg font-bold">
          Ton budget
        </h2>
        <div role="radiogroup" aria-label="Budget" className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((option) => {
            const selected = budget === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setBudget(option.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Distance */}
      <section aria-labelledby="distance-title">
        <h2 id="distance-title" className="mb-3 font-display text-lg font-bold">
          Jusqu'où veux-tu aller ?
        </h2>
        <div role="radiogroup" aria-label="Distance" className="flex flex-wrap gap-2">
          {DISTANCE_OPTIONS.map((km) => {
            const selected = maxDistanceKm === km;
            return (
              <button
                key={km}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMaxDistanceKm(km)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent"
                )}
              >
                {km} km
              </button>
            );
          })}
        </div>
      </section>

      {/* Cuisine */}
      <section aria-labelledby="cuisine-title">
        <h2 id="cuisine-title" className="mb-3 font-display text-lg font-bold">
          Tu veux manger quoi ?
        </h2>
        <div role="radiogroup" aria-label="Cuisine" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={cuisine === "all"}
            onClick={() => setCuisine("all")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
              cuisine === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
          >
            🍽️ Tout
          </button>
          {SELECTABLE_CUISINES.map((option) => {
            const selected = cuisine === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCuisine(option.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent"
                )}
              >
                {option.emoji} {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <Button size="lg" className="w-full" onClick={() => void handleSubmit()} disabled={submitting}>
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
        Trouver des restaurants
      </Button>
    </div>
  );
}