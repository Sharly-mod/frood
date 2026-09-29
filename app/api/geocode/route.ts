import { NextRequest, NextResponse } from "next/server";
import type { Coordinates } from "@/types/filters";

/**
 * Free geocoding proxy: Nominatim (OpenStreetMap). No key, no billing.
 * Local list is tried first in the client; this route covers any other place.
 * Nominatim policy: ≤1 req/s, custom UA, cache aggressively — done below.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const cache = new Map<string, { ts: number; data: Coordinates | null }>();

async function searchNominatim(q: string, countrycodes?: string): Promise<Coordinates | null> {
  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);
  if (countrycodes) {
    url.searchParams.set("countrycodes", countrycodes);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Frood/1.0 (restaurant tournament app)" },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      throw new Error(`Nominatim ${response.status}`);
    }
    const json = (await response.json()) as Array<{
      lat: string;
      lon: string;
      name?: string;
      display_name?: string;
    }>;
    const first = json[0];
    if (!first) {
      return null;
    }
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      label: first.name || first.display_name?.split(",")[0] || q,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json(null);
  }

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  try {
    // Prefer France, then retry globally (e.g. a city abroad).
    let data = await searchNominatim(q, "fr");
    if (!data) {
      data = await searchNominatim(q);
    }
    cache.set(key, { ts: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Géocodeur indisponible." }, { status: 503 });
  }
}