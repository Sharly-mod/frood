import type { Restaurant } from "../types/restaurant";
import { appConfig } from "../config/app";
import { getCuisineEmoji } from "../data/cuisines";

function buildShareText(winner: Restaurant): string {
  return appConfig.shareMessage(winner.name, getCuisineEmoji(winner.cuisine));
}

function buildShareUrl(): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://frood.app";
  return `${base}/?smart=1`;
}

export type ShareResult = "shared" | "copied" | "unsupported";

/**
 * Uses the Web Share API when available, otherwise copies the text to the clipboard.
 */
export async function shareResult(winner: Restaurant): Promise<ShareResult> {
  const text = buildShareText(winner);
  const url = buildShareUrl();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: appConfig.name, text, url });
      return "shared";
    } catch (error) {
      // User cancelled the share sheet — fall through to clipboard copy.
      void error;
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "unsupported";
  }
}