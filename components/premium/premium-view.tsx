"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Check, Crown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useSession } from "@/lib/session-context";
import { PLANS } from "@/lib/pricing";
import { PREMIUM_FEATURES } from "@/lib/feature-flags";
import { requestBillingPortal, requestPremiumCheckout } from "@/services/stripeService";
import { activateSimSubscription } from "@/lib/dev-subscription";
import { DEV_PREMIUM } from "@/lib/flags";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/user";

export function PremiumView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium, user, refresh } = useSession();
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);

  const handleCheckout = useCallback(
    async (plan: SubscriptionPlan) => {
      setPendingPlan(plan);
      const result = await requestPremiumCheckout(plan);
      setPendingPlan(null);

      if (result.error || !result.url) {
        toast(result.error ?? "Impossible de lancer le paiement.", "error");
        return;
      }
      router.push(result.url);
    },
    [router]
  );

  const handlePortal = useCallback(async () => {
    const result = await requestBillingPortal();
    if (result.error || !result.url) {
      toast(result.error ?? "Impossible d'ouvrir le portail.", "error");
      return;
    }
    router.push(result.url);
  }, [router]);

  /* Handle return URLs (mock + real Stripe). */
  useEffect(() => {
    const plan = (searchParams.get("plan") as SubscriptionPlan | null) ?? "monthly";

    if (searchParams.get("mock") === "success") {
      activateSimSubscription(plan);
      toast("Premium activé en mode simulation ✨", "success");
      void refresh();
      return;
    }
    if (searchParams.get("success") === "true") {
      toast("Merci ! Ton abonnement est activé 🎉", "success");
      void refresh();
    }
    if (searchParams.get("canceled") === "true") {
      toast("Paiement annulé. Tu restes sur le plan Free.", "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const benefits = useMemo(() => PREMIUM_FEATURES, []);

  if (isPremium) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="flex flex-col items-center rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <Crown className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          </div>
          <Badge variant="success" className="mb-2">
            ✨ Premium actif
          </Badge>
          <h1 className="font-display text-3xl font-black tracking-tight">
            {DEV_PREMIUM ? "Mode développement" : "Profite bien !"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {DEV_PREMIUM
              ? "NEXT_PUBLIC_DEV_PREMIUM=true — ton abonnement est simulé."
              : "Tournois jusqu'à 32 restaurants, filtres avancés, historique illimité."}
          </p>

          <div className="mt-8 w-full space-y-2 text-left">
            {benefits.map((f) => (
              <p key={f.feature} className="flex items-center gap-2 text-sm">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="font-medium">{f.title}</span>
              </p>
            ))}
          </div>

          {user ? (
            <Button className="mt-8 w-full" size="lg" variant="outline" onClick={() => void handlePortal()}>
              Gérer l'abonnement
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-3xl" aria-hidden="true">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight">
          Arrête de réfléchir.
          <br />
          Laisse le tournoi décider.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Plus de restaurants. Plus de choix. Plus de tournois.
        </p>
      </div>

      <ul className="mt-8 space-y-3">
        {benefits.map((f) => (
          <li key={f.feature} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-4">
        {PLANS.map((plan) => {
          const yearly = plan.id === "yearly";
          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-3xl border-2 bg-card p-6 shadow-sm",
                yearly ? "border-primary shadow-lg" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{plan.name}</p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-black">{plan.priceLabel}</span>
                    <span className="text-sm text-muted-foreground">{plan.periodLabel}</span>
                  </p>
                </div>
                {yearly ? <Badge variant="default">{plan.badge}</Badge> : null}
              </div>
              <Button
                size="lg"
                className="mt-4 w-full"
                variant={yearly ? "default" : "outline"}
                onClick={() => void handleCheckout(plan.id)}
                disabled={pendingPlan !== null}
              >
                {pendingPlan === plan.id ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
                {plan.checkoutLabel}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Paiement sécurisé par Stripe. Annulable à tout moment.
      </p>
    </div>
  );
}