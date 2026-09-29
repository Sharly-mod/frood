"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Restaurant } from "@/types/restaurant";
import { getRestaurantsByIds } from "@/services/restaurantService";
import { useTournament } from "@/hooks/useTournament";
import { useTournamentHistory } from "@/hooks/useTournamentHistory";
import { useFavorites } from "@/hooks/useFavorites";
import { useSession } from "@/lib/session-context";
import { getRemainingTournaments } from "@/lib/feature-flags";
import { clearSelection } from "@/lib/selection";
import { MatchCard, type MatchCardState } from "@/components/tournament/match-card";
import { TournamentLanding } from "@/components/tournament/tournament-landing";
import { WinnerScreen } from "@/components/tournament/winner-screen";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

type LoadState = "loading" | "ready" | "error";

export function TournamentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium } = useSession();
  const { addRecord } = useTournamentHistory();
  const { isFavorite, toggleFavorite } = useFavorites();

  const ids = useMemo(
    () => searchParams.get("ids")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );

  const [participants, setParticipants] = useState<Restaurant[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(ids.length === 0 ? "ready" : "loading");
  const quotaBlocked = ids.length > 0 && !isPremium && getRemainingTournaments(isPremium) <= 0;

  useEffect(() => {
    let mounted = true;
    setLoadState("loading");

    if (ids.length === 0) {
      setParticipants([]);
      setLoadState("ready");
      return;
    }

    void getRestaurantsByIds(ids)
      .then((found) => {
        if (!mounted) return;
        setParticipants(found);
        setLoadState("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setLoadState("error");
      });

    return () => {
      mounted = false;
    };
  }, [ids]);

  const tournament = useTournament(participants);
  const { currentMatch, currentRoundName, completedMatches, totalMatches, progress, winner, isFinished } =
    tournament;

  const [pickedWinnerId, setPickedWinnerId] = useState<string | null>(null);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    setPickedWinnerId(null);
    return () => {
      if (advanceTimer.current) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, [currentMatch?.id]);

  const handlePick = (restaurant: Restaurant) => {
    if (!currentMatch || pickedWinnerId) return;
    setPickedWinnerId(restaurant.id);
    advanceTimer.current = window.setTimeout(() => {
      tournament.selectWinner(restaurant);
    }, 900);
  };

  const savedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || !winner || savedRef.current) return;
    savedRef.current = true;
    void addRecord({
      winnerRestaurantId: winner.id,
      participantIds: participants.map((p) => p.id),
      budget: null,
    });
  }, [isFinished, winner, participants, addRecord]);

  const handlePlayAgain = () => {
    savedRef.current = false;
    tournament.reset();
  };

  const handleClose = () => {
    clearSelection();
    router.push("/");
  };

  /* ------------------------- states ------------------------- */

  if (quotaBlocked) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4">
        <EmptyState
          emoji="⏳"
          title="Tu as utilisé tes 3 tournois gratuits aujourd'hui."
          description="Reviens demain ou passe à Premium pour continuer."
          action={
            <div className="flex flex-col gap-2">
              <Link href="/premium" className="w-full">
                <Button className="w-full" size="lg">
                  Voir Premium
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => router.push("/")}>
                Fermer
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md px-4">
        <ErrorState
          title="Impossible de lancer le tournoi"
          description="Les restaurants n'ont pas pu être chargés."
          retry={() => router.refresh()}
        />
      </div>
    );
  }

  if (ids.length === 0) {
    return <TournamentLanding />;
  }

  if (participants.length < 2) {
    return (
      <div className="mx-auto max-w-md px-4">
        <EmptyState
          emoji="🥊"
          title="Il te faut au moins 2 restaurants"
          description="Reviens sur la liste et ajoute des restaurants à ton tournoi."
          action={
            <Link href="/" className="w-full">
              <Button className="w-full" size="lg">
                Trouver des restaurants
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isFinished && winner) {
    return (
      <div className="mx-auto max-w-lg">
        <WinnerScreen
          winner={winner}
          isFavorite={isFavorite(winner.id)}
          onToggleFavorite={() => void toggleFavorite(winner)}
          onPlayAgain={handlePlayAgain}
          onClose={handleClose}
        />
      </div>
    );
  }

  if (!currentMatch) {
    return null;
  }

  const matchStates = (restaurantId: string): MatchCardState => {
    if (!pickedWinnerId) return "idle";
    return pickedWinnerId === restaurantId ? "winner" : "loser";
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      {/* header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {currentRoundName}
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.min(completedMatches + 1, totalMatches)} / {totalMatches}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {participants.length} restaurants
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress * 100} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.max(progress * 100, 4)}%` }}
          />
        </div>
      </div>

      {/* match */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <MatchCard
          key={`a-${currentMatch.id}`}
          restaurant={currentMatch.contestants[0]}
          state={matchStates(currentMatch.contestants[0].id)}
          onSelect={handlePick}
          onReject={() => handlePick(currentMatch.contestants[1])}
        />
        <MatchCard
          key={`b-${currentMatch.id}`}
          restaurant={currentMatch.contestants[1]}
          state={matchStates(currentMatch.contestants[1].id)}
          onSelect={handlePick}
          onReject={() => handlePick(currentMatch.contestants[0])}
        />

        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-border bg-background font-display text-sm font-black shadow-lg"
          )}
          aria-hidden="true"
        >
          VS
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Glisse la carte ou touche pour voter 👆
      </p>
    </div>
  );
}