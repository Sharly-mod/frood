"use client";

import { useEffect, useMemo, useState } from "react";
import type { Restaurant } from "../types/restaurant";
import type { RestaurantFilters } from "../types/filters";
import { getRestaurants } from "../services/restaurantService";

interface UseRestaurantsResult {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRestaurants(filters: RestaurantFilters): UseRestaurantsResult {
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRestaurants(filters)
      .then((data) => {
        if (cancelled) return;
        setRestaurants(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les restaurants.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, tick]);

  const refetch = () => setTick((t) => t + 1);

  return { restaurants, loading, error, refetch };
}