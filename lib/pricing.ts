import type { SubscriptionPlan } from "../types/user";

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  priceLabel: string;
  periodLabel: string;
  badge: string | null;
  checkoutLabel: string;
}

export const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "Mensuel",
    price: 3.99,
    priceLabel: "3,99 €",
    periodLabel: "/mois",
    badge: null,
    checkoutLabel: "Passer à Premium",
  },
  {
    id: "yearly",
    name: "Annuel",
    price: 29.99,
    priceLabel: "29,99 €",
    periodLabel: "/an",
    badge: "Économise environ 37 %",
    checkoutLabel: "Passer à Premium",
  },
];

export const PREMIUM_PRICE_MONTHLY = "3,99 €/mois";
export const PREMIUM_PRICE_YEARLY = "29,99 €/an";

export function getPlanPriceLabel(id: SubscriptionPlan): string {
  return id === "yearly" ? PREMIUM_PRICE_YEARLY : PREMIUM_PRICE_MONTHLY;
}