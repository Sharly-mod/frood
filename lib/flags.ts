export const DEV_PREMIUM = process.env.NEXT_PUBLIC_DEV_PREMIUM === "true";
export const USE_MOCK_RESTAURANTS = process.env.NEXT_PUBLIC_USE_MOCK_RESTAURANTS !== "false";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_ENABLED = Boolean(STRIPE_SECRET_KEY);