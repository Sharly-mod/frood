import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "@/lib/flags";

/**
 * Stripe webhook: keeps `subscriptions` and `profiles.subscription_status` in sync.
 * Without a webhook secret configured the application simply stays in mock mode.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (userId) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          status: "active",
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const status = subscription.status === "active" || subscription.status === "trialing" ? "premium" : "free";
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(
            (subscription.items.data[0]?.current_period_end ?? 0) * 1000
          ).toISOString(),
        });
        await supabase
          .from("profiles")
          .update({ subscription_status: status })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        await supabase
          .from("profiles")
          .update({ subscription_status: "free" })
          .eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}