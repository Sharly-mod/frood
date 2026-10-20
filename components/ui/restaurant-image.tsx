"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getCuisineEmoji } from "@/data/cuisines";
import type { Cuisine } from "@/types/restaurant";

interface RestaurantImageProps {
  src: string;
  alt: string;
  cuisine: Cuisine;
  /** Restaurant name — used to load its real photo via /api/photo. */
  name?: string;
  /** Venue address — appended to the photo search for a better match. */
  address?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function RestaurantImage({ src, alt, cuisine, name, address, className, priority, sizes }: RestaurantImageProps) {
  const photoUrl = name
    ? `/api/photo?name=${encodeURIComponent(name)}${address ? `&address=${encodeURIComponent(address)}` : ""}`
    : null;
  // External images go through the local proxy so next/image never needs
  // another hostname in images.remotePatterns.
  const fallbackSrc = src.startsWith("http") ? `/api/img?u=${encodeURIComponent(src)}` : src;
  // Paint the stock image instantly, then swap to the real photo once it has
  // been preloaded — no blank phase while the photo API resolves.
  const [showPhoto, setShowPhoto] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!photoUrl) return;
    let disposed = false;
    let started = false;
    let image: HTMLImageElement | null = null;

    const onLoad = () => {
      if (!disposed) setShowPhoto(true);
    };
    const onError = () => setFailed(true);

    const startPreload = () => {
      if (started || disposed) return;
      started = true;
      image = new window.Image();
      image.referrerPolicy = "no-referrer";
      image.addEventListener("load", onLoad);
      image.addEventListener("error", onError);
      image.src = photoUrl;
    };

    // Only fetch the real photo when the card is (almost) visible, so a list
    // of 15 restaurants doesn't fire 15 photo lookups at mount.
    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      startPreload();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          startPreload();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      if (image) {
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
      }
    };
  }, [photoUrl]);

  return (
    <div ref={wrapperRef} className={cn("absolute inset-0 h-full w-full overflow-hidden", className)}>
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-accent to-secondary"
        >
          <span className="text-5xl drop-shadow-sm" aria-hidden="true">
            {getCuisineEmoji(cuisine)}
          </span>
        </div>
      ) : (
        <Image
          src={showPhoto && photoUrl ? photoUrl : fallbackSrc}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 640px) 100vw, 50vw"}
          className="object-cover"
          onError={() => {
            if (showPhoto) {
              // Real photo failed at render time → fall back to the stock image.
              setShowPhoto(false);
            } else {
              setFailed(true);
            }
          }}
          priority={priority}
        />
      )}
    </div>
  );
}