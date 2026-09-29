import type { Restaurant } from "./restaurant";

/** A slot inside a match: either a real restaurant (first round or bye) or a pending winner. */
export type TournamentSlot = Restaurant | undefined;

export interface TournamentMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  contestants: [TournamentSlot, TournamentSlot];
  /** Feed match id (+ side) used to resolve a pending-winner slot at runtime. */
  sourceMatchIds: [string | null, string | null];
  winner?: Restaurant;
}

/** A match whose contestants have been resolved from past-round winners. */
export type ResolvedMatch = TournamentMatch & { contestants: [Restaurant, Restaurant] };

export interface TournamentRound {
  name: string;
  matches: TournamentMatch[];
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentSummary {
  participantIds: string[];
  winnerId: string;
  budgetLabel: string;
  createdAt: string;
}