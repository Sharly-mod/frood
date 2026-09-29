export type SubscriptionStatus = "free" | "premium" | "trialing" | "canceled" | "incomplete";

export type SubscriptionPlan = "monthly" | "yearly";

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  subscriptionStatus: SubscriptionStatus;
  isAdmin: boolean;
  premiumLifetime: boolean;
  createdAt: string;
}

export interface TournamentRecord {
  id: string;
  user_id: string;
  winner_restaurant_id: string;
  participant_ids: string[];
  budget: string | null;
  created_at: string;
}

export interface FavoriteRecord {
  id: string;
  restaurant_id: string;
  created_at: string;
}