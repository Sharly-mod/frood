"use client";

import { MapPin, Star, Wallet, Heart, Plus, Minus, Navigation } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RestaurantImage } from "@/components/ui/restaurant-image";
import { cn, formatDistance, formatPrice, formatRating, formatReviewCount, priceRangeSymbols } from "@/lib/utils";
import { getCuisineEmoji, getCuisineLabel } from "@/data/cuisines";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  isFavorite: boolean;
  onToggleSelect: (restaurant: Restaurant) => void;
  onToggleFavorite: (restaurant: Restaurant) => void;
  selectLabel?: string;
}

export function RestaurantCard({
  restaurant,
  isSelected,
  isFavorite,
  onToggleSelect,
  onToggleFavorite,
  selectLabel = "Ajouter au tournoi",
}: RestaurantCardProps) {
  const cuisineEmoji = getCuisineEmoji(restaurant.cuisine);
  const cuisineLabel = getCuisineLabel(restaurant.cuisine);

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <RestaurantImage
          src={restaurant.image}
          name={restaurant.name}
          address={restaurant.address}
          alt={`Photo de ${restaurant.name}`}
          cuisine={restaurant.cuisine}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        <Badge
          variant={restaurant.isOpen ? "success" : "muted"}
          className="absolute left-3 top-3 shadow-sm"
        >
          {restaurant.isOpen ? "Ouvert" : "Fermé"}
        </Badge>
        <button
          type="button"
          aria-label={isFavorite ? `Retirer ${restaurant.name} des favoris` : `Ajouter ${restaurant.name} aux favoris`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(restaurant);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform active:scale-90 cursor-pointer"
        >
          <Heart
            className={cn("h-4.5 w-4.5", isFavorite ? "fill-red-500 text-red-500" : "text-slate-600")}
            aria-hidden="true"
          />
        </button>
        {isSelected ? (
          <Badge variant="default" className="absolute bottom-3 right-3 shadow-sm">
            Ajouté
          </Badge>
        ) : null}
      </div>

      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-tight">{restaurant.name}</h3>
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <span aria-hidden="true">{cuisineEmoji}</span>
          <span>{cuisineLabel}</span>
          <span aria-hidden="true">·</span>
          <span title={`${priceRangeSymbols(restaurant.priceRange)}`}>{priceRangeSymbols(restaurant.priceRange)}</span>
        </p>

        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="font-semibold">{formatRating(restaurant.rating)}</span>
          <span className="text-muted-foreground">({formatReviewCount(restaurant.reviewCount)})</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDistance(restaurant.distance)}
          </span>
          <span className="flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            ~{formatPrice(restaurant.averagePrice)}
          </span>
        </div>

        <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5 leading-snug">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{restaurant.address ?? "Adresse indisponible"}</span>
          </p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:underline"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            Y aller
          </a>
        </div>

        <Button
          variant={isSelected ? "soft" : "default"}
          className="w-full"
          onClick={() => onToggleSelect(restaurant)}
          aria-pressed={isSelected}
        >
          {isSelected ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {isSelected ? "Retirer" : selectLabel}
        </Button>
      </CardContent>
    </Card>
  );
}