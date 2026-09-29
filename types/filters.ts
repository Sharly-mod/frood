import type { Cuisine } from "./restaurant";

export type Budget = "<10" | "10-15" | "15-25" | "25-40" | "any";

export interface Coordinates {
  lat: number;
  lng: number;
  label?: string;
}

export interface RestaurantFilters {
  budget: Budget;
  maxDistanceKm: number;
  cuisine: Cuisine | "all";
  location: Coordinates | null;
}

export const DEFAULT_FILTERS: RestaurantFilters = {
  budget: "any",
  maxDistanceKm: 5,
  cuisine: "all",
  location: null,
};