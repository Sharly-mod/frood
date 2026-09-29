import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { STRIPE_ENABLED, STRIPE_SECRET_KEY } from "@/lib/flags";
import type { SubscriptionPlan } from "@/types/user";

const FREE_PLAN_IDS = new Set<SubscriptionPlan>(["monthly", "yearly"]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const body = (await request.json()) as { plan?: SubscriptionPlan };
  const plan = body.plan;

  if (!plan || !FREE_PLAN_IDS.has(plan)) {
    return NextResponse.json({ url: null, error: "Plan invalide." }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: authData } = await (supabase
    ? supabase.auth.getUser()
    : Promise.resolve({ data: { user: null } }));
  const userId = authData?.user?.id ?? null;

  /* ---- Mock mode: no Stripe keys configured. ------------------------- */
  if (!STRIPE_ENABLED) {
    return NextResponse.json({
      url: `${origin}/premium?mock=success=true&plan=${plan}`,
      error: null,
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const priceKey = plan === "yearly" ? "NEXT_PUBLIC_STRIPE_PRICE_YEARLY" : "NEXT_PUBLIC_STRIPE_PRICE_MONTHLY";
  const priceId = process.env[priceKey] ?? "";

  if (!priceId) {
    return NextResponse.json({ url: null, error: "Prix Stripe non configuré." }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { userId: userId ?? "", plan },
      subscription_data: { metadata: { userId: userId ?? "", plan } },
      ...(userId ? { client_reference_id: userId } : {}),
    });
    return NextResponse.json({ url: session.url, error: null });
  } catch {
    return NextResponse.json({ url: null, error: "Impossible de créer la session de paiement." }, { status: 500 });
  }
}