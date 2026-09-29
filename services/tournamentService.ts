import type { Restaurant } from "../types/restaurant";
import type { TournamentBracket, TournamentMatch, TournamentRound } from "../types/tournament";

/**
 * A competitor slot.
 * - `value`: the actual restaurant when one is known (original participant or bye).
 * - `sourceId`: id of the match whose winner occupies this slot (when pending).
 * A slot is "empty" only when both are falsy (bye used to pad round 1 to a power of two).
 */
interface Entry {
  value: Restaurant | undefined;
  sourceId: string | null;
}

export function buildBracket(participants: Restaurant[]): TournamentBracket {
  const list = [...participants];
  if (list.length < 2) {
    return { rounds: [] };
  }

  let entries: Entry[] = padToPowerOfTwo(list).map((r) => ({ value: r, sourceId: null }));
  const rounds: TournamentRound[] = [];
  let roundIndex = 0;

  while (entries.length > 1) {
    const next: Entry[] = [];
    const matches: TournamentMatch[] = [];

    for (let i = 0; i < entries.length; i += 2) {
      const a = entries[i];
      const b = entries[i + 1];

      // A position is filled either by a known restaurant or a match-sourced winner.
      // Two filled positions always produce a match; otherwise it's a bye (propagate).
      if ((a.value || a.sourceId) && (b.value || b.sourceId)) {
        const match: TournamentMatch = {
          id: `r${roundIndex}-m${matches.length}`,
          roundIndex,
          matchIndex: matches.length,
          contestants: [a.value, b.value],
          sourceMatchIds: [a.sourceId, b.sourceId],
        };
        matches.push(match);
        next.push({ value: undefined, sourceId: match.id });
      } else {
        next.push({
          value: a.value ?? b.value,
          sourceId: a.sourceId ?? b.sourceId,
        });
      }
    }

    rounds.push({ name: getRoundName(entries.length), matches });
    entries = next;
    roundIndex += 1;
  }

  return { rounds };
}

export function getRoundName(participantsCount: number): string {
  switch (participantsCount) {
    case 2:
      return "Finale";
    case 4:
      return "Demi-finale";
    case 8:
      return "Quart de finale";
    case 16:
      return "Huitième de finale";
    case 32:
      return "Seizième de finale";
    case 64:
      return "32es de finale";
    default:
      return "Manche";
  }
}

function padToPowerOfTwo(list: Restaurant[]): (Restaurant | undefined)[] {
  const nextPowerOfTwo = 2 ** Math.ceil(Math.log2(list.length));
  const padded: (Restaurant | undefined)[] = [...list];
  while (padded.length < nextPowerOfTwo) {
    padded.push(undefined);
  }
  return padded;
}

export function countActionableMatches(bracket: TournamentBracket): number {
  return bracket.rounds.reduce((acc, round) => acc + round.matches.length, 0);
}