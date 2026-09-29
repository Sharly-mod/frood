import type { SubscriptionPlan } from "../types/user";

interface CheckoutResponse {
  url: string | null;
  error: string | null;
}

/**
 * Thin client wrapper around the payment backend.
 * Swap the implementation (Stripe → Paddle, in-app purchase...) here later.
 */
export async function requestPremiumCheckout(plan: SubscriptionPlan): Promise<CheckoutResponse> {
  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!response.ok) {
      return { url: null, error: "Impossible de contacter le service de paiement." };
    }
    return (await response.json()) as CheckoutResponse;
  } catch {
    return { url: null, error: "Impossible de contacter le service de paiement." };
  }
}

export async function requestBillingPortal(): Promise<CheckoutResponse> {
  try {
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    if (!response.ok) {
      return { url: null, error: "Impossible d'ouvrir le portail de gestion." };
    }
    return (await response.json()) as CheckoutResponse;
  } catch {
    return { url: null, error: "Impossible d'ouvrir le portail de gestion." };
  }
}