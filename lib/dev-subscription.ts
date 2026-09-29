import type { SubscriptionPlan } from "../types/user";

const KEY = "ff:sim-subscription";

export interface SimSubscription {
  plan: SubscriptionPlan;
  status: "active" | "canceled";
  expiresAt: string;
}

/**
 * Simulated subscription used in development when Stripe is not configured.
 * Lets you test the Free/Premium flows end-to-end.
 */
function readRaw(): SimSubscription | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SimSubscription;
  } catch {
    return null;
  }
}

export function getSimSubscription(): SimSubscription | null {
  const sub = readRaw();
  if (!sub) return null;
  if (sub.status !== "active") return null;
  if (new Date(sub.expiresAt).getTime() <= Date.now()) {
    clearSimSubscription();
    return null;
  }
  return sub;
}

export function activateSimSubscription(plan: SubscriptionPlan): SimSubscription {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (plan === "yearly" ? 12 : 1));
  const sub: SimSubscription = { plan, status: "active", expiresAt: expiresAt.toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sub));
  } catch {
    // ignore
  }
  return sub;
}

export function clearSimSubscription(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function isSimPremiumActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const sub = readRaw();
  if (!sub || sub.status !== "active") return false;
  return new Date(sub.expiresAt).getTime() > Date.now();
}