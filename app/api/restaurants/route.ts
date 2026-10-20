import { NextRequest, NextResponse } from "next/server";
import type { Cuisine, Restaurant } from "@/types/restaurant";
import { haversineKm } from "@/lib/geo";
import { readDiskCache, writeDiskCache } from "@/lib/disk-cache";

/**
 * Free restaurant provider: OpenStreetMap via the Overpass API.
 * No API key, no billing — the endpoint is the only thing to change if you
 * later move to Google Places or TomTom (see services/restaurantService).
 */

const OVERPASS_ENDPOINTS = (
  process.env.OVERPASS_INTERPRETER ??
  [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
  ].join(",")
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const SEARCH_TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const DISK_CACHE_NAMESPACE = "restaurants";
/** Overpass (and other OSM mirrors) return 406 without a real User-Agent. */
const REQUEST_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Frood/1.0 (https://frood.app)",
};

const cache = new Map<string, { ts: number; data: Restaurant[] }>();

function getCached(key: string): Restaurant[] | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.data;
  }
  if (hit) {
    cache.delete(key);
  }
  return null;
}

function setCached(key: string, data: Restaurant[]) {
  cache.set(key, { ts: Date.now(), data });
}

type RawElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string | undefined>;
};

async function fetchElements(ql: string): Promise<RawElement[]> {
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: REQUEST_HEADERS,
        body: `data=${encodeURIComponent(ql)}`,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Overpass ${response.status} (${endpoint})`);
      }
      const json = (await response.json()) as { elements?: RawElement[] };
      return json.elements ?? [];
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Overpass indisponible.");
}

async function queryOverpass(ql: string): Promise<Restaurant[]> {
  return (await fetchElements(ql))
    .map(mapElement)
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=75`;

/**
 * Verified Unsplash photo ids (same pool as data/restaurants.ts), grouped by
 * cuisine. One photo is picked per restaurant by hashing its id so cards vary.
 * "french" is the fallback cuisine for most OSM results → it gets the full pool.
 */
const ALL_PHOTO_IDS = [
  "1568901346375-23c9450c58cd",
  "1574071318508-1cdbab80d002",
  "1579871494447-9811cf80d66c",
  "1551504734-5ee1c4a1479b",
  "1569718212165-3a8278d5f624",
  "1512621776951-a57141f2eefd",
  "1562967914-608f82629710",
  "1509042239860-f550ce710b93",
  "1555396273-367ea4eb4db5",
  "1546833999-b9f581a1996d",
  "1559314809-0d155014e29e",
  "1519676867240-f03562e64548",
  "1546069901-ba9599a7e63c",
  "1599974579688-8dbdd335c77f",
  "1550547660-d9450f859349",
  "1563245372-f21724e3856d",
  "1573080496219-bb080dd4f877",
  "1551024506-0bccd828d307",
  "1495603889488-42d1d66e5523",
  "1540914124281-342587941389",
  "1513104890138-7c749659a591",
  "1544025162-d76694265947",
  "1504674900247-0877df9cc836",
  "1414235077428-338989a2e8c0",
];

const IMAGE_POOLS: Record<Cuisine, string[]> = {
  burger: ["1568901346375-23c9450c58cd", "1550547660-d9450f859349"],
  pizza: ["1574071318508-1cdbab80d002", "1513104890138-7c749659a591"],
  japanese: ["1579871494447-9811cf80d66c", "1544025162-d76694265947"],
  mexican: ["1551504734-5ee1c4a1479b", "1599974579688-8dbdd335c77f"],
  asian: [
    "1569718212165-3a8278d5f624",
    "1559314809-0d155014e29e",
    "1563245372-f21724e3856d",
    "1504674900247-0877df9cc836",
  ],
  healthy: [
    "1512621776951-a57141f2eefd",
    "1546069901-ba9599a7e63c",
    "1540914124281-342587941389",
  ],
  chicken: ["1562967914-608f82629710", "1573080496219-bb080dd4f877"],
  coffee: ["1509042239860-f550ce710b93", "1495603889488-42d1d66e5523"],
  french: ALL_PHOTO_IDS,
  dessert: ["1519676867240-f03562e64548", "1551024506-0bccd828d307"],
};

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickImage(cuisine: Cuisine, restaurantId: string): string {
  const pool = IMAGE_POOLS[cuisine];
  return unsplash(pool[hashString(restaurantId) % pool.length]);
}

/**
 * Real venue photos when OSM links one (`image` URL or `wikimedia_commons`
 * File:…). Commons is served through Special:FilePath (hotlink-friendly,
 * resizable). Returns null when the venue has no photo → stock pool fallback.
 */
function resolveRealImage(tags: Record<string, string | undefined>): string | null {
  const imageTag = tags.image?.trim();
  if (imageTag && /^https?:\/\//i.test(imageTag)) {
    return imageTag;
  }

  const commons = tags.wikimedia_commons?.trim();
  if (commons) {
    if (/^https?:\/\//i.test(commons)) {
      return commons;
    }
    const file = commons.replace(/^(File|Image):/i, "").replace(/ /g, "_");
    if (file) {
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
    }
  }

  return null;
}

/** OSM `cuisine` tag keywords, then name keywords → app cuisine. */
function cuisineFromOsm(cuisineTag: string | undefined, amenity: string | undefined, name?: string): Cuisine {
  const tags = cuisineTag ? cuisineTag.toLowerCase() : "";

  const rules: Array<[string, Cuisine]> = [
    ["sushi", "japanese"],
    ["japanese", "japanese"],
    ["japonais", "japanese"],
    ["ramen", "japanese"],
    ["mexican", "mexican"],
    ["mexicain", "mexican"],
    ["tacos", "mexican"],
    ["chinese", "asian"],
    ["chinois", "asian"],
    ["thai", "asian"],
    ["vietnamese", "asian"],
    ["vietnamien", "asian"],
    ["indian", "asian"],
    ["asiatique", "asian"],
    ["asian", "asian"],
    ["burger", "burger"],
    ["pizza", "pizza"],
    ["salad", "healthy"],
    ["healthy", "healthy"],
    ["vegan", "healthy"],
    ["vegetarian", "healthy"],
    ["chicken", "chicken"],
    ["poulet", "chicken"],
    ["coffee", "coffee"],
    ["tea", "coffee"],
    ["cafe", "coffee"],
    ["café", "coffee"],
    ["french", "french"],
    ["francais", "french"],
    ["français", "french"],
    ["bistro", "french"],
    ["crepe", "french"],
    ["ice_cream", "dessert"],
    ["dessert", "dessert"],
    ["gelato", "dessert"],
    ["patisserie", "dessert"],
    ["bakery", "dessert"],
  ];

  for (const [keyword, cuisine] of rules) {
    if (tags.includes(keyword)) {
      return cuisine;
    }
  }

  // Fall back to the restaurant name (many OSM entries have no cuisine tag).
  const normalizedName = (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const nameRules: Array<[string, Cuisine]> = [
    ["pizza", "pizza"],
    ["pizzeria", "pizza"],
    ["sushi", "japanese"],
    ["ramen", "japanese"],
    ["yakitori", "japanese"],
    ["burger", "burger"],
    ["kebab", "burger"],
    ["falafel", "burger"],
    ["taco", "mexican"],
    ["taqueria", "mexican"],
    ["wok", "asian"],
    ["china", "asian"],
    ["chinois", "asian"],
    ["asian", "asian"],
    ["asiat", "asian"],
    ["thai", "asian"],
    ["viet", "asian"],
    ["salade", "healthy"],
    ["vegan", "healthy"],
    ["bio ", "healthy"],
    ["poulet", "chicken"],
    ["chicken", "chicken"],
    ["creperie", "dessert"],
    ["crepe", "dessert"],
    ["patisserie", "dessert"],
    ["glacier", "dessert"],
    ["coffee", "coffee"],
    ["cafe ", "coffee"],
    ["brasserie", "french"],
    ["bistrot", "french"],
    ["bistro", "french"],
    ["couscous", "french"],
    ["tajine", "french"],
  ];
  for (const [keyword, cuisine] of nameRules) {
    if (normalizedName.includes(keyword)) {
      return cuisine;
    }
  }

  if (amenity === "cafe") return "coffee";
  if (amenity === "ice_cream") return "dessert";
  if (amenity === "fast_food") return "burger";
  return "french";
}

const PRICE_FROM_CUISINE: Record<Cuisine, number> = {
  burger: 12,
  pizza: 14,
  japanese: 16,
  mexican: 12,
  asian: 14,
  healthy: 14,
  chicken: 11,
  coffee: 5,
  french: 22,
  dessert: 8,
};

function priceFromAverage(price: number): number {
  if (price < 10) return 1;
  if (price < 20) return 2;
  if (price < 30) return 3;
  return 4;
}

/** Deterministic pseudo-ratings anchored on real OSM signals: venues with a
 *  photo, contact details or opening hours rank higher. Stable per element. */
function deriveRating(
  elementId: string,
  tags: Record<string, string | undefined>
): { rating: number; reviewCount: number } {
  let rating = 4.1 + (hashString(elementId) % 9) / 10;
  if (tags["wikimedia_commons"] || tags.image) rating += 0.15;
  if (tags.website || tags["contact:website"]) rating += 0.1;
  if (tags.phone || tags["contact:phone"]) rating += 0.05;
  if (tags.opening_hours) rating += 0.05;
  rating = Math.min(4.9, Math.max(3.6, rating));
  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount: 20 + (hashString(`${elementId}/reviews`) % 480),
  };
}

function mapElement(element: {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string | undefined>;
}): Restaurant | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  if (!name || lat === undefined || lon === undefined) {
    return null;
  }

  const cuisine = cuisineFromOsm(tags.cuisine, tags.amenity, name);
  const realImage = resolveRealImage(tags);
  const basePrice = PRICE_FROM_CUISINE[cuisine];
  // Small deterministic jitter so neighbouring cards don't all show the same price.
  const averagePrice = Math.min(45, Math.max(4, basePrice + (hashString(`${element.type}/${element.id}`) % 7) - 3));
  const streetName = tags["addr:street"] ?? tags["contact:street"] ?? tags["addr:place"];
  const street = [tags["addr:housenumber"], streetName].filter(Boolean).join(" ");
  const city = tags["addr:city"] ?? tags["contact:city"] ?? tags["addr:suburb"];
  const address = `${street}${street && city ? ", " : ""}${city ?? ""}`.trim();
  const { rating, reviewCount } = deriveRating(`${element.type}/${element.id}`, tags);

  return {
    id: `${element.type}/${element.id}`,
    name,
    cuisine,
    priceRange: priceFromAverage(averagePrice),
    averagePrice,
    rating,
    reviewCount,
    distance: 0,
    image: realImage ?? pickImage(cuisine, `${element.type}/${element.id}`),
    hasRealPhoto: Boolean(realImage),
    isOpen: Boolean(tags.opening_hours),
    latitude: lat,
    longitude: lon,
    address,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
  };
}

/**
 * Many OSM restaurant nodes carry no `addr:*` tags, but the building they sit
 * in usually does. One bulk Overpass query pulls nearby addressed buildings
 * (around:35 m per missing venue) and each missing address is filled from its
 * closest building. Whole search is cached, so this costs one extra query per
 * unique area.
 */
async function enrichMissingAddresses(restaurants: Restaurant[]): Promise<Restaurant[]> {
  const missing = restaurants.filter((restaurant) => !restaurant.address);
  // Skip pathological cases (huge areas) so this extra query can't hurt.
  if (missing.length === 0 || missing.length > 40) {
    return restaurants;
  }

  const blocks = missing.map(
    (restaurant) =>
      `way["addr:street"]["addr:housenumber"](around:25,${restaurant.latitude},${restaurant.longitude});`
  );

  const ql = `[out:json][timeout:25];
(
  ${blocks.join("\n  ")}
);
out center tags;`;

  let buildings: RawElement[];
  try {
    buildings = await fetchElements(ql);
  } catch {
    return restaurants;
  }

  const resolved = new Map<string, string | null>();
  for (const candidate of missing) {
    let best: RawElement | null = null;
    let bestDistance = 90;
    for (const building of buildings) {
      const lat = building.center?.lat ?? building.lat;
      const lon = building.center?.lon ?? building.lon;
      if (lat === undefined || lon === undefined) continue;
      const meters = haversineKm(candidate.latitude, candidate.longitude, lat, lon) * 1000;
      if (meters < bestDistance) {
        bestDistance = meters;
        best = building;
      }
    }
    if (!best?.tags) {
      resolved.set(candidate.id, null);
      continue;
    }
    const street = [best.tags["addr:housenumber"], best.tags["addr:street"]].filter(Boolean).join(" ");
    if (!street) {
      resolved.set(candidate.id, null);
      continue;
    }
    const city = best.tags["addr:city"];
    resolved.set(candidate.id, [street, city].filter(Boolean).join(", ") || null);
  }

  return restaurants.map((restaurant) => {
    if (restaurant.address || !resolved.has(restaurant.id)) {
      return restaurant;
    }
    const found = resolved.get(restaurant.id);
    return found ? { ...restaurant, address: found } : restaurant;
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("ids")) {
    const ids = (params.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }
    const cacheKey = `ids:${ids.join(",")}`;
    const cached = getCached(cacheKey) ?? (await readDiskCache<Restaurant[]>(DISK_CACHE_NAMESPACE, cacheKey, CACHE_TTL_MS));
    if (cached) {
      setCached(cacheKey, cached);
      return NextResponse.json(byIdOrder(cached, ids));
    }

    const grouped: Record<string, number[]> = { node: [], way: [], rel: [] };
    for (const id of ids) {
      const [type, raw] = id.split("/");
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        const bucket = type === "way" ? "way" : type === "relation" ? "rel" : "node";
        grouped[bucket].push(numeric);
      }
    }

    const blocks = (["node", "way", "rel"] as const)
      .filter((type) => grouped[type].length > 0)
      .map((type) => `${type}(id:${grouped[type].join(",")});`);

    if (blocks.length === 0) {
      return NextResponse.json([]);
    }

    const ql = `[out:json][timeout:25];
(
  ${blocks.join("\n  ")}
);
out center tags;`;

    try {
      const data = await queryOverpass(ql);
      setCached(cacheKey, data);
      void writeDiskCache(DISK_CACHE_NAMESPACE, cacheKey, data);
      return NextResponse.json(byIdOrder(data, ids));
    } catch {
      return NextResponse.json([]);
    }
  }

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusMeters = Math.min(Math.max(Number(params.get("radius")) || 3000, 500), 10000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat et lng sont requis." }, { status: 400 });
  }

  const cacheKey = `search:${lat.toFixed(4)},${lng.toFixed(4)},${radiusMeters}`;
  const cached = getCached(cacheKey) ?? (await readDiskCache<Restaurant[]>(DISK_CACHE_NAMESPACE, cacheKey, CACHE_TTL_MS));
  if (cached) {
    setCached(cacheKey, cached);
    return NextResponse.json(cached);
  }

  const ql = (radius: number) => `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe|ice_cream)$"]["name"](around:${radius},${lat},${lng});
);
out center tags 80;`;

  try {
    // Progressive scan: a dense urban area fills 80 results within ~1.5 km, so
    // the default 5 km view resolves in one fast query instead of a huge scan.
    let data = await queryOverpass(ql(Math.min(radiusMeters, 1500)));
    if (data.length < 80 && radiusMeters > 1500) {
      const full = await queryOverpass(ql(radiusMeters));
      const seen = new Set(data.map((restaurant) => restaurant.id));
      data = data.concat(full.filter((restaurant) => !seen.has(restaurant.id)));
    }
    data = data
      .map((restaurant) => ({
        ...restaurant,
        distance: Math.round(haversineKm(lat, lng, restaurant.latitude, restaurant.longitude) * 10) / 10,
      }))
      .sort((a, b) => a.distance - b.distance);
    const enriched = await enrichMissingAddresses(data);
    setCached(cacheKey, enriched);
    void writeDiskCache(DISK_CACHE_NAMESPACE, cacheKey, enriched);
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Fournisseur de restaurants indisponible." }, { status: 503 });
  }
}

function byIdOrder(data: Restaurant[], ids: string[]): Restaurant[] {
  const byId = new Map(data.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is Restaurant => Boolean(r));
}