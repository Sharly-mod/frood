"use client";

import { useCallback } from "react";
import { Heart, MapPin, RefreshCw, Share2, Star, Trophy, Wallet } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { Button } from "@/components/ui/button";
import { RestaurantImage } from "@/components/ui/restaurant-image";
import { toast } from "@/components/ui/toast";
import { shareResult } from "@/services/shareService";
import { cn, formatDistance, formatPrice, formatRating } from "@/lib/utils";
import { getCuisineEmoji, getCuisineLabel } from "@/data/cuisines";

const CONFETTI_EMOJIS = ["🎉", "🎊", "🍔", "🍕", "🍣", "🥳", "✨", "🍟", "🌟"];

interface WinnerScreenProps {
  winner: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlayAgain: () => void;
  onClose: () => void;
}

export function WinnerScreen({ winner, isFavorite, onToggleFavorite, onPlayAgain, onClose }: WinnerScreenProps) {
  const handleShare = useCallback(async () => {
    const result = await shareResult(winner);
    if (result === "copied") {
      toast("Résultat copié dans le presse-papiers ✅");
    } else if (result === "unsupported") {
      toast("Le partage n'est pas disponible sur cet appareil.", "error");
    }
  }, [winner]);

  const handleSeePlace = useCallback(() => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${winner.latitude},${winner.longitude}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }, [winner]);

  return (
    <div className="relative flex w-full flex-col items-center overflow-hidden px-4 py-8 text-center">
      {/* Light confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI_EMOJIS.map((emoji, i) => (
          <span
            key={i}
            className="animate-confetti absolute top-0 text-2xl"
            style={{
              left: `${(i * 11 + 5) % 100}%`,
              animationDuration: `${4 + (i % 5) * 0.9}s`,
              animationDelay: `${i * 0.35}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="animate-trophy mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl shadow-lg" aria-hidden="true">
        <Trophy className="h-8 w-8 text-amber-500" />
      </div>

      <p className="animate-pop-in text-xs font-bold uppercase tracking-[0.25em] text-primary">Ton gagnant</p>
      <h2 className="animate-pop-in font-display text-4xl font-black tracking-tight">{winner.name}</h2>

      <div className="animate-pop-in relative mt-6 aspect-square w-56 overflow-hidden rounded-[2rem] shadow-2xl">
        <RestaurantImage src={winner.image} name={winner.name} address={winner.address} alt={`Photo de ${winner.name}`} cuisine={winner.cuisine} sizes="280px" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground">
          {getCuisineEmoji(winner.cuisine)} {getCuisineLabel(winner.cuisine)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <strong className="text-foreground">{formatRating(winner.rating)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Environ {formatPrice(winner.averagePrice)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {formatDistance(winner.distance)}
        </span>
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5">
        <Button size="lg" onClick={handleSeePlace}>
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Voir le restaurant
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} aria-hidden="true" />
          {isFavorite ? "Dans tes favoris" : "Ajouter aux favoris"}
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button size="lg" variant="soft" onClick={onPlayAgain}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Refaire
          </Button>
          <Button size="lg" variant="soft" onClick={handleShare}>
            <Share2 className="h-5 w-5" aria-hidden="true" />
            Partager
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 text-sm text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
        >
          Fermer le tournoi
        </button>
      </div>
    </div>
  );
}