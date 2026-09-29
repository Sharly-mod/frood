"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Star, Wallet } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { RestaurantImage } from "@/components/ui/restaurant-image";
import { cn, formatPrice, formatRating, formatReviewCount, priceRangeSymbols } from "@/lib/utils";
import { getCuisineEmoji, getCuisineLabel } from "@/data/cuisines";

export type MatchCardState = "idle" | "winner" | "loser";

interface MatchCardProps {
  restaurant: Restaurant;
  state: MatchCardState;
  onSelect: (restaurant: Restaurant) => void;
  /** Fired when the card is swiped left — reject this one, pick the other. */
  onReject?: () => void;
}

const SWIPE_THRESHOLD = 96;
const ROTATE_PER_PX = 0.045;

export function MatchCard({ restaurant, state, onSelect, onReject }: MatchCardProps) {
  const isWinner = state === "winner";
  const isLoser = state === "loser";

  const [offset, setOffset] = useState({ dx: 0, animating: false });
  const draggingRef = useRef(false);
  const committedRef = useRef(false);
  const dxRef = useRef(0);
  const startRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (state !== "idle" || draggingRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    committedRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
    dxRef.current = 0;
    setOffset({ dx: 0, animating: false });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - startRef.current.x;
    dxRef.current = dx;
    setOffset({ dx, animating: false });
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dx = dxRef.current;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      committedRef.current = true;
      setOffset({ dx: 0, animating: false });
      if (dx > 0) {
        onSelect(restaurant);
      } else {
        onReject?.();
      }
      return;
    }

    // Snap back over two frames so the transition actually animates.
    requestAnimationFrame(() => {
      setOffset({ dx, animating: true });
      requestAnimationFrame(() => {
        setOffset({ dx: 0, animating: true });
      });
    });
  };

  const handlePointerUp = () => endDrag();
  const handlePointerCancel = () => endDrag();

  const transform =
    offset.dx !== 0 || offset.animating
      ? `translateX(${offset.dx}px) rotate(${offset.dx * ROTATE_PER_PX}deg)`
      : undefined;

  return (
    <button
      type="button"
      onClick={() => {
        if (!committedRef.current) onSelect(restaurant);
      }}
      disabled={state !== "idle"}
      aria-pressed={isWinner}
      aria-label={`Choisir ${restaurant.name}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        touchAction: "pan-y",
        transform,
        transition: offset.animating ? "transform 300ms ease" : "none",
      }}
      className={cn(
        "relative flex w-full select-none flex-col overflow-hidden rounded-3xl bg-card text-left shadow-md cursor-pointer",
        state === "idle" && "hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] animate-pop-in",
        isWinner && "animate-pop-in ring-4 ring-primary ring-offset-2",
        isLoser && "scale-[0.98] opacity-40 grayscale"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <RestaurantImage
          src={restaurant.image}
          name={restaurant.name}
          address={restaurant.address}
          alt={`Photo de ${restaurant.name}`}
          cuisine={restaurant.cuisine}
          sizes="(max-width: 640px) 45vw, 30vw"
        />
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-display text-base font-bold leading-tight sm:text-lg">{restaurant.name}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <span aria-hidden="true">{getCuisineEmoji(restaurant.cuisine)}</span>
          <span>{getCuisineLabel(restaurant.cuisine)}</span>
          <span aria-hidden="true">·</span>
          <span aria-hidden="true">{priceRangeSymbols(restaurant.priceRange)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            {formatRating(restaurant.rating)}
          </span>
          <span className="text-muted-foreground">{formatReviewCount(restaurant.reviewCount)} avis</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            {formatPrice(restaurant.averagePrice)}
          </span>
        </div>
      </div>

      {offset.dx > 14 ? (
        <span className="pointer-events-none absolute left-4 top-4 z-10 -rotate-6 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-lg animate-pop-in">
          ✔️ Tu préfères
        </span>
      ) : null}
      {offset.dx < -14 ? (
        <span className="pointer-events-none absolute right-4 top-4 z-10 rotate-6 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-black text-white shadow-lg animate-pop-in">
          ✖️ Non
        </span>
      ) : null}

      {isWinner ? (
        <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg animate-pop-in">
          🏆 Gagnant !
        </span>
      ) : null}
    </button>
  );
}