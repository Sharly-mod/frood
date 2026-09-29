"use client";

import { useCallback, useMemo, useState } from "react";
import type { Restaurant } from "../types/restaurant";
import type { ResolvedMatch, TournamentMatch } from "../types/tournament";
import { buildBracket, countActionableMatches } from "../services/tournamentService";

interface UseTournamentResult {
  currentMatch: ResolvedMatch | null;
  currentRoundName: string | null;
  completedMatches: number;
  totalMatches: number;
  progress: number;
  winner: Restaurant | null;
  isFinished: boolean;
  selectWinner: (restaurant: Restaurant) => void;
  reset: () => void;
}

function resolveContestant(
  match: TournamentMatch,
  side: 0 | 1,
  winners: Map<string, Restaurant>
): Restaurant | undefined {
  const direct = match.contestants[side];
  if (direct) {
    return direct;
  }
  const sourceId = match.sourceMatchIds[side];
  if (!sourceId) {
    return undefined;
  }
  return winners.get(sourceId);
}

/**
 * First match whose result is still open and whose contestants are already known
 * (i.e. the previous round has been fully played).
 */
function findFirstPendingMatch(
  bracket: ReturnType<typeof buildBracket>,
  winners: Map<string, Restaurant>
): ResolvedMatch | null {
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (winners.has(match.id)) {
        continue;
      }
      const a = resolveContestant(match, 0, winners);
      const b = resolveContestant(match, 1, winners);
      if (a && b) {
        return { ...match, contestants: [a, b] };
      }
      // Contestants not decided yet — a match earlier in the bracket must
      // still be pending; keep scanning for safety.
    }
  }
  return null;
}

export function useTournament(participants: Restaurant[]): UseTournamentResult {
  const bracket = useMemo(() => buildBracket(participants), [participants]);
  const totalMatches = useMemo(() => countActionableMatches(bracket), [bracket]);

  const [winners, setWinners] = useState<Map<string, Restaurant>>(() => new Map());

  const currentMatch = useMemo(
    () => findFirstPendingMatch(bracket, winners),
    [bracket, winners]
  );

  const selectWinner = useCallback(
    (restaurant: Restaurant) => {
      if (!currentMatch) {
        return;
      }
      setWinners((prev) => {
        const next = new Map(prev);
        next.set(currentMatch.id, restaurant);
        return next;
      });
    },
    [currentMatch]
  );

  const reset = useCallback(() => {
    setWinners(new Map());
  }, []);

  const winner = useMemo<Restaurant | null>(() => {
    if (participants.length === 1) {
      return participants[0];
    }
    if (!currentMatch && winners.size > 0) {
      const finalRound = bracket.rounds[bracket.rounds.length - 1];
      const finalMatch = finalRound?.matches[0];
      if (finalMatch) {
        const w = winners.get(finalMatch.id);
        if (w) {
          return w;
        }
      }
    }
    return null;
  }, [currentMatch, winners, bracket, participants]);

  const isFinished = Boolean(winner);

  const completedMatches = useMemo(
    () => bracket.rounds.reduce((acc, round) => acc + round.matches.filter((m) => winners.has(m.id)).length, 0),
    [bracket, winners]
  );

  const progress = totalMatches === 0 ? 0 : completedMatches / totalMatches;

  const currentRoundName = currentMatch ? bracket.rounds[currentMatch.roundIndex]?.name ?? null : null;

  return {
    currentMatch,
    currentRoundName,
    completedMatches,
    totalMatches,
    progress,
    winner,
    isFinished,
    selectWinner,
    reset,
  };
}