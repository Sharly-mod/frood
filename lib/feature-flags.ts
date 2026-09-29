import { DEV_PREMIUM } from "./flags";

export type Feature =
  | "largeTournament"
  | "advancedFilters"
  | "tournamentHistory"
  | "unlimitedFavorites"
  | "groupMode"
  | "noAds";

export const FREE_DAILY_TOURNAMENT_LIMIT = 3;
export const FREE_MAX_PARTICIPANTS = 8;
export const PREMIUM_MAX_PARTICIPANTS = 32;

/**
 * Feature gating. Change the business rules here to alter the monetization model.
 */
export function canUseFeature(feature: Feature, isPremium: boolean): boolean {
  if (DEV_PREMIUM) {
    return true;
  }

  switch (feature) {
    case "largeTournament":
    case "advancedFilters":
    case "tournamentHistory":
    case "unlimitedFavorites":
    case "groupMode":
    case "noAds":
      return isPremium;
    default:
      return false;
  }
}

export function getMaxTournamentParticipants(isPremium: boolean): number {
  return canUseFeature("largeTournament", isPremium)
    ? PREMIUM_MAX_PARTICIPANTS
    : FREE_MAX_PARTICIPANTS;
}

export function getFeatureMessage(feature: Feature): string {
  switch (feature) {
    case "largeTournament":
      return "Les tournois jusqu'à 8 restaurants sont gratuits. Passe à Premium pour organiser des tournois jusqu'à 32 restaurants.";
    case "advancedFilters":
      return "Les filtres avancés sont réservés aux membres Premium.";
    case "tournamentHistory":
      return "L'historique des tournois est réservé aux membres Premium.";
    default:
      return "Cette fonctionnalité est réservée aux membres Premium.";
  }
}

export const PREMIUM_FEATURES: { feature: Feature; title: string; description: string }[] = [
  { feature: "largeTournament", title: "Tournois jusqu'à 32 restaurants", description: "Plus de choix, plus de fun." },
  { feature: "advancedFilters", title: "Filtres avancés", description: "Affine encore plus tes recherches." },
  { feature: "tournamentHistory", title: "Historique des tournois", description: "Retrouve tous tes anciens combats." },
  { feature: "unlimitedFavorites", title: "Favoris illimités", description: "Garde tous tes restaurants préférés." },
  { feature: "groupMode", title: "Mode groupe", description: "Bientôt : décidez à plusieurs." },
  { feature: "noAds", title: "Sans publicité", description: "Jusqu'à 3 tournois gratuits par jour deviennent illimités." },
];

/* ------------------------- Free quota (client side) ------------------------- */

const QUOTA_STORAGE_KEY = "ff:tournament-quota";

interface QuotaState {
  date: string;
  count: number;
}

function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function readQuota(): QuotaState {
  if (typeof window === "undefined") {
    return { date: todayKey(), count: 0 };
  }
  try {
    const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) {
      return { date: todayKey(), count: 0 };
    }
    const parsed = JSON.parse(raw) as QuotaState;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function writeQuota(state: QuotaState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — ignore
  }
}

export function getDailyTournamentCount(): number {
  return readQuota().count;
}

export function getRemainingTournaments(isPremium: boolean): number {
  if (canUseFeature("noAds", isPremium)) {
    return Infinity;
  }
  return Math.max(0, FREE_DAILY_TOURNAMENT_LIMIT - getDailyTournamentCount());
}

export function canStartTournament(isPremium: boolean): boolean {
  return getRemainingTournaments(isPremium) > 0;
}

export function incrementDailyTournamentCount(): number {
  const state = readQuota();
  const next = { date: todayKey(), count: state.count + 1 };
  writeQuota(next);
  return next.count;
}