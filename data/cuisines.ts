import type { Cuisine } from "../types/restaurant";

export interface CuisineOption {
  value: Cuisine;
  label: string;
  emoji: string;
}

export const SELECTABLE_CUISINES: CuisineOption[] = [
  { value: "burger", label: "Burger", emoji: "🍔" },
  { value: "pizza", label: "Pizza", emoji: "🍕" },
  { value: "japanese", label: "Japonais", emoji: "🍣" },
  { value: "mexican", label: "Mexicain", emoji: "🌮" },
  { value: "asian", label: "Asiatique", emoji: "🍜" },
  { value: "healthy", label: "Healthy", emoji: "🥗" },
  { value: "chicken", label: "Poulet", emoji: "🍗" },
  { value: "coffee", label: "Café", emoji: "☕" },
];

const defaultEmoji: Record<Cuisine, string> = {
  burger: "🍔",
  pizza: "🍕",
  japanese: "🍣",
  mexican: "🌮",
  asian: "🍜",
  healthy: "🥗",
  chicken: "🍗",
  coffee: "☕",
  french: "🍽️",
  dessert: "🍰",
};

const defaultLabel: Record<Cuisine, string> = {
  burger: "Burger",
  pizza: "Pizza",
  japanese: "Japonais",
  mexican: "Mexicain",
  asian: "Asiatique",
  healthy: "Healthy",
  chicken: "Poulet",
  coffee: "Café",
  french: "Français",
  dessert: "Dessert",
};

export function getCuisineEmoji(cuisine: Cuisine): string {
  return SELECTABLE_CUISINES.find((c) => c.value === cuisine)?.emoji ?? defaultEmoji[cuisine] ?? "🍽️";
}

export function getCuisineLabel(cuisine: Cuisine): string {
  return SELECTABLE_CUISINES.find((c) => c.value === cuisine)?.label ?? defaultLabel[cuisine] ?? cuisine;
}