import { type NextRequest, NextResponse } from "next/server";
import { readDiskCache, writeDiskCache } from "@/lib/disk-cache";

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const TTL_OK_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_MISS_MS = 60 * 60 * 1000;
const CACHE_MAX = 1000;
const COMMONS_MAX_CONCURRENT = 4;
const UA = "Frood/1.0 (https://frood.app)";
const COMMONS_CONTEXT_WORDS = [
  "restaurant",
  "brasserie",
  "bistro",
  "cafe",
  "hotel",
  "tabac",
  "paris",
  "rue",
  "avenue",
  "place",
  "cave",
  "grill",
  "traiteur",
  "creperie",
  "food",
];

type CacheEntry = { url: string | null; ts: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();

function remember(key: string, entry: CacheEntry) {
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ---- Google Places (needs GOOGLE_PLACES_API_KEY) --------------------------

async function googleLookup(name: string, address?: string): Promise<string | null> {
  try {
    const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.photos",
      },
      body: JSON.stringify({
        textQuery: address ? `${name}, ${address}` : name,
        languageCode: "fr",
        regionCode: "FR",
        maxResultCount: 1,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!searchResponse.ok) {
      return null;
    }
    const data = (await searchResponse.json()) as {
      places?: Array<{ photos?: Array<{ name: string }> }>;
    };
    const photoName = data.places?.[0]?.photos?.[0]?.name;
    if (!photoName) {
      return null;
    }
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${encodeURIComponent(GOOGLE_KEY)}`;
    const mediaResponse = await fetch(mediaUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });
    if (mediaResponse.status >= 300 && mediaResponse.status < 400) {
      const location = mediaResponse.headers.get("location");
      if (location) {
        return new URL(location, mediaUrl).toString();
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Wikimedia Commons (free, no key) -------------------------------------

let commonsActive = 0;
const commonsWaiters: Array<() => void> = [];

async function withCommonsSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (commonsActive >= COMMONS_MAX_CONCURRENT) {
    await new Promise<void>((resolve) => commonsWaiters.push(resolve));
  }
  commonsActive += 1;
  try {
    return await fn();
  } finally {
    commonsActive -= 1;
    commonsWaiters.shift()?.();
  }
}

function commonsContextTokens(address?: string): string[] {
  return normalizeText(address ?? "")
    .split(" ")
    .filter((token) => token.length >= 4);
}

async function commonsLookup(name: string, address?: string): Promise<string | null> {
  return withCommonsSlot(async () => {
    try {
      const searchUrl = new URL("https://commons.wikimedia.org/w/api.php");
      searchUrl.searchParams.set("action", "query");
      searchUrl.searchParams.set("list", "search");
      searchUrl.searchParams.set("srnamespace", "6");
      searchUrl.searchParams.set("srlimit", "8");
      searchUrl.searchParams.set("format", "json");
      // Rank by the venue name; the address is used only as a bonus signal
      // (appending it to the query pushes good files out of the top results).
      searchUrl.searchParams.set("srsearch", name);

      const searchResponse = await fetch(searchUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(3000),
      });
      if (!searchResponse.ok) {
        return null;
      }
      const json = (await searchResponse.json()) as {
        query?: { search?: Array<{ title: string }> };
      };
      const results = json.query?.search ?? [];

      const tokens = normalizeText(name)
        .split(" ")
        .filter((token) => token.length >= 4);
      if (tokens.length === 0) {
        return null;
      }

      let best: { title: string; bonus: number } | null = null;
      for (const result of results) {
        if (!/\.(jpe?g|png|webp)$/i.test(result.title)) continue;
        const title = normalizeText(result.title.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, ""));
        if (!tokens.every((token) => title.includes(token))) continue;
        const bonus =
          COMMONS_CONTEXT_WORDS.filter((word) => title.includes(word)).length +
          commonsContextTokens(address).filter((word) => title.includes(word)).length;
        // Ambiguous single-token names need a venue-context word in the title.
        if (tokens.length < 2 && bonus === 0) continue;
        if (!best || bonus > best.bonus) {
          best = { title: result.title, bonus };
        }
      }
      if (!best) {
        return null;
      }

      const fileName = best.title.replace(/^File:/i, "").replace(/ /g, "_");
      const filePathUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=800`;
      // Resolve the chain to the CDN (upload.wikimedia.org) so the cached URL
      // is a stable direct file; drop the body early.
      const mediaResponse = await fetch(filePathUrl, {
        headers: { "User-Agent": UA },
        redirect: "follow",
        signal: AbortSignal.timeout(3000),
      });
      if (!mediaResponse.ok) {
        return null;
      }
      const finalUrl = mediaResponse.url;
      mediaResponse.body?.cancel().catch(() => {});
      return finalUrl;
    } catch {
      return null;
    }
  });
}

// ---- Orchestration --------------------------------------------------------

async function resolvePhotoUrl(name: string, address?: string): Promise<string | null> {
  if (GOOGLE_KEY) {
    const googleUrl = await googleLookup(name, address);
    if (googleUrl) {
      return googleUrl;
    }
  }
  return commonsLookup(name, address);
}

const DISK_CACHE_NAMESPACE = "photos";

async function lookupCached(name: string, address?: string): Promise<string | null> {
  const key = name.toLowerCase();
  const entry = cache.get(key);
  const ttl = entry?.url ? TTL_OK_MS : TTL_MISS_MS;
  if (entry && Date.now() - entry.ts <= ttl) {
    return entry.url;
  }

  // Disk fallback: restarting the server must not re-hit Wikimedia/Google.
  const diskEntry = await readDiskCache<CacheEntry>(DISK_CACHE_NAMESPACE, key, TTL_MISS_MS);
  if (diskEntry) {
    remember(key, diskEntry);
    return diskEntry.url;
  }

  const pending = inFlight.get(key) ?? resolvePhotoUrl(name, address);
  inFlight.set(key, pending);
  try {
    const url = await pending;
    const resolved: CacheEntry = { url, ts: Date.now() };
    remember(key, resolved);
    void writeDiskCache(DISK_CACHE_NAMESPACE, key, resolved);
    return url;
  } finally {
    inFlight.delete(key);
  }
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const BYTE_CACHE_MAX = 150;

type ByteCacheEntry = { data: Uint8Array; contentType: string; ts: number };

const byteCache = new Map<string, ByteCacheEntry>();

function rememberBytes(url: string, entry: ByteCacheEntry) {
  byteCache.delete(url);
  byteCache.set(url, entry);
  if (byteCache.size > BYTE_CACHE_MAX) {
    const oldest = byteCache.keys().next().value;
    if (oldest !== undefined) byteCache.delete(oldest);
  }
}

// Buffers the upstream image so repeat requests (preload, every requested
// next/image width, re-renders) are served instantly from memory.
async function fetchImageBytes(url: string): Promise<ByteCacheEntry | null> {
  const cached = byteCache.get(url);
  if (cached && Date.now() - cached.ts <= TTL_OK_MS) {
    return cached;
  }
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) {
      return null;
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return null;
    }
    const data = new Uint8Array(await upstream.arrayBuffer());
    if (data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }
    const entry: ByteCacheEntry = { data, contentType, ts: Date.now() };
    rememberBytes(url, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Real restaurant photo, served as bytes so next/image's optimizer works
 * (internal routes can't 302). Google Places if a key is set, otherwise
 * Wikimedia Commons; 404 → client falls back to the stock image.
 */
export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim().slice(0, 120);
  const address = (request.nextUrl.searchParams.get("address") ?? "").trim().slice(0, 160);

  if (!name) {
    return new NextResponse(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const url = await lookupCached(name, address || undefined);
  if (!url) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": GOOGLE_KEY ? "public, max-age=3600" : "public, max-age=1800" },
    });
  }

  const image = await fetchImageBytes(url);
  if (!image) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const body = new ArrayBuffer(image.data.byteLength);
  new Uint8Array(body).set(image.data);

  return new Response(new Blob([body], { type: image.contentType }), {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      // Name-keyed URL is deterministic → the browser can cache it hard.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}