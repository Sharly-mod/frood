export const CUISINES = [
  "burger",
  "pizza",
  "japanese",
  "mexican",
  "asian",
  "healthy",
  "chicken",
  "coffee",
  "french",
  "dessert",
] as const;

export type Cuisine = (typeof CUISINES)[number];

export interface Restaurant {
  id: string;
  name: string;
  cuisine: Cuisine;
  priceRange: number;
  averagePrice: number;
  rating: number;
  reviewCount: number;
  distance: number;
  image: string;
  isOpen: boolean;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string | null;
  website?: string | null;
  hasRealPhoto?: boolean;
}