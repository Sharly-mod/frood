import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxies a remote image and returns its bytes. Used by <RestaurantImage> so
 * every image src is a local URL — `next/image`'s optimizer can't follow
 * 302s from internal routes, so this streams the body instead of redirecting.
 */
function isSafeImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    return false;
  }
  // Private / loopback ranges (basic SSRF guard).
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return false;
  }
  if (host === "[::1]" || host === "::1") {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  if (!isSafeImageUrl(raw)) {
    return new NextResponse(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstream = await fetch(raw, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse(null, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}