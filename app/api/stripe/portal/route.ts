import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { STRIPE_ENABLED, STRIPE_SECRET_KEY } from "@/lib/flags";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { url: null, error: "Supabase n'est pas configuré." },
      { status: 500 }
    );
  }

  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    return NextResponse.json({ url: `${origin}/auth/login`, error: null });
  }

  if (!STRIPE_ENABLED) {
    return NextResponse.json({ url: null, error: "Stripe n'est pas configuré en mode développement." }, { status: 400 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ url: null, error: "Aucun abonnement actif." }, { status: 400 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/profile`,
    });
    return NextResponse.json({ url: session.url, error: null });
  } catch {
    return NextResponse.json({ url: null, error: "Impossible d'ouvrir le portail de gestion." }, { status: 500 });
  }
}