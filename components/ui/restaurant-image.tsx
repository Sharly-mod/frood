"use client";

import { useEffect, useState } from "react";
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
  // Paint the stock image instantly, then swap to the real photo as soon as
  // it has preloaded — no blank phase while the photo API resolves.
  const [showPhoto, setShowPhoto] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!photoUrl) return;
    let alive = true;
    const image = new window.Image();
    image.referrerPolicy = "no-referrer";
    const onLoad = () => {
      if (alive) setShowPhoto(true);
    };
    const onError = () => setFailed(true);
    image.addEventListener("load", onLoad);
    image.addEventListener("error", onError);
    image.src = photoUrl;
    return () => {
      alive = false;
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
    };
  }, [photoUrl]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-primary/25 via-accent to-secondary",
          className
        )}
      >
        <span className="text-5xl drop-shadow-sm" aria-hidden="true">
          {getCuisineEmoji(cuisine)}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={showPhoto && photoUrl ? photoUrl : fallbackSrc}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 640px) 100vw, 50vw"}
      className={cn("object-cover", className)}
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
  );
}