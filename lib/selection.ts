const SELECTION_KEY = "ff:selection";

export function loadSelection(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(SELECTION_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSelection(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable
  }
}

export function clearSelection(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(SELECTION_KEY);
  } catch {
    // ignore
  }
}