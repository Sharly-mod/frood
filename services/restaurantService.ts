import type { Restaurant } from "../types/restaurant";
import type { Budget, RestaurantFilters } from "../types/filters";
import { mockRestaurants } from "../data/restaurants";
import { haversineKm } from "../lib/geo";
import { USE_MOCK_RESTAURANTS } from "../lib/flags";

const SIMULATED_LATENCY_MS = 350;

const budgetConstraint: Record<Budget, { min?: number; max?: number }> = {
  "<10": { max: 9.99 },
  "10-15": { min: 10, max: 15.99 },
  "15-25": { min: 16, max: 25.99 },
  "25-40": { min: 26, max: 40.99 },
  any: {},
};

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

/**
 * Restaurant data access.
 * - mock (default / no coords): `data/restaurants.ts`
 * - real: `/api/restaurants` → OpenStreetMap (Overpass), free, no key.
 *   Enable with NEXT_PUBLIC_USE_MOCK_RESTAURANTS=false.
 * Mock is kept as a silent fallback when the provider errors.
 */
export async function getRestaurants(filters: RestaurantFilters): Promise<Restaurant[]> {
  let candidates: Restaurant[] = [];

  if (!USE_MOCK_RESTAURANTS && filters.location) {
    try {
      const radiusMeters = Math.round(filters.maxDistanceKm * 1000);
      const query = new URLSearchParams({
        lat: String(filters.location.lat),
        lng: String(filters.location.lng),
        radius: String(radiusMeters),
      });
      const response = await fetch(`/api/restaurants?${query}`);
      const json = (await response.json()) as Restaurant[] | { error: string };
      if (Array.isArray(json)) {
        candidates = json;
      }
    } catch {
      // fall through to mock
    }
  }

  if (candidates.length === 0) {
    candidates = mockRestaurants;
  }

  const location = filters.location;

  let matches = candidates.filter((restaurant) => {
    const priceRange = budgetConstraint[filters.budget];
    const priceOk =
      (priceRange.min === undefined || restaurant.averagePrice >= priceRange.min) &&
      (priceRange.max === undefined || restaurant.averagePrice <= priceRange.max);

    const cuisineOk = filters.cuisine === "all" || restaurant.cuisine === filters.cuisine;
    return priceOk && cuisineOk;
  });

  if (location) {
    matches = matches
      .map((restaurant) => ({
        ...restaurant,
        distance: haversineKm(location.lat, location.lng, restaurant.latitude, restaurant.longitude),
      }))
      .filter((restaurant) => restaurant.distance <= filters.maxDistanceKm);
  } else {
    matches = matches.filter((restaurant) => restaurant.distance <= filters.maxDistanceKm);
  }

  matches = matches.sort((a, b) => a.distance - b.distance);
  return delay(matches);
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  if (!USE_MOCK_RESTAURANTS) {
    const found = await getRestaurantsByIds([id]);
    if (found.length > 0) {
      return found[0];
    }
  }
  const restaurant = mockRestaurants.find((r) => r.id === id) ?? null;
  return delay(restaurant);
}

/**
 * Returns restaurants in the exact order of `ids` (keeps the bracket order stable).
 */
export async function getRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
  if (ids.length === 0) {
    return [];
  }

  if (!USE_MOCK_RESTAURANTS) {
    try {
      const query = new URLSearchParams({ ids: ids.join(",") });
      const response = await fetch(`/api/restaurants?${query}`);
      const json = (await response.json()) as Restaurant[] | { error: string };
      if (Array.isArray(json)) {
        return json;
      }
    } catch {
      // fall through to mock
    }
  }

  const byId = new Map(mockRestaurants.map((r) => [r.id, r]));
  const found = ids
    .map((id) => byId.get(id))
    .filter((r): r is Restaurant => Boolean(r));
  return delay(found);
}