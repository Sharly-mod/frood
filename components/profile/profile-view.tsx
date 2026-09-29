"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, Crown, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import { useFavorites } from "@/hooks/useFavorites";
import { useTournamentHistory } from "@/hooks/useTournamentHistory";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { clearSimSubscription, isSimPremiumActive } from "@/lib/dev-subscription";
import { DEV_PREMIUM } from "@/lib/flags";

export function ProfileView() {
  const router = useRouter();
  const { user, profile, isPremium, isAdmin, loading, refresh } = useSession();
  const { favorites, loaded: favoritesLoaded } = useFavorites();
  const { records, loaded: historyLoaded } = useTournamentHistory();

  const supabase = getSupabaseBrowser();
  const simPremium = isSimPremiumActive();

  async function handleSignOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast("Impossible de se déconnecter.", "error");
        return;
      }
    }
    void refresh();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight">Connecte-toi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Synchronise tes favoris et ton historique, et débloque ton statut Premium partout.
          </p>
          <Link href="/auth/login" className="mt-6 w-full">
            <Button size="lg" className="w-full">
              Se connecter
            </Button>
          </Link>
          <Link href="/auth/signup" className="mt-2 w-full">
            <Button size="lg" variant="outline" className="w-full">
              Créer un compte
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initial = (profile?.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-2xl font-black text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-black tracking-tight md:text-2xl">
            {profile?.displayName ?? "Frooder"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={isPremium ? "success" : "secondary"} className="shrink-0">
          {isPremium ? (
            <>
              <Crown className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Premium
            </>
          ) : (
            "Free"
          )}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-3xl font-black">{historyLoaded ? records.length : "…"}</p>
          <p className="text-xs font-medium text-muted-foreground">Tournois</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-3xl font-black">{favoritesLoaded ? favorites.length : "…"}</p>
          <p className="text-xs font-medium text-muted-foreground">Favoris</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-3xl font-black">{isPremium ? "∞" : "3"}</p>
          <p className="text-xs font-medium text-muted-foreground">Tournois / jour</p>
        </div>
      </div>

      {!isPremium ? (
        <Link href="/premium" className="mt-4 block">
          <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-sm">
            <p className="text-sm font-medium">
              Passe à Premium — tournois illimités & jusqu'à 32 restaurants.
            </p>
            <Crown className="ml-3 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          </div>
        </Link>
      ) : DEV_PREMIUM || simPremium ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            {DEV_PREMIUM
              ? "Mode développement : NEXT_PUBLIC_DEV_PREMIUM=true."
              : "Abonnement simulé en mode développement."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearSimSubscription();
              void refresh();
              toast("Simulation de Premium désactivée.", "info");
            }}
          >
            Réinitialiser
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="mt-4 w-full" onClick={() => void handlePortalSafe()}>
          <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
          Gérer l'abonnement
        </Button>
      )}

      <Button variant="ghost" className="mt-6 w-full text-destructive" onClick={() => void handleSignOut()}>
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
        Se déconnecter
      </Button>

      {isAdmin ? (
        <Link href="/admin" className="mt-2 w-full">
          <Button variant="ghost" className="w-full">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Administration
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

async function handlePortalSafe() {
  const { requestBillingPortal } = await import("@/services/stripeService");
  const result = await requestBillingPortal();
  if (result.error || !result.url) {
    toast(result.error ?? "Impossible d'ouvrir le portail.", "error");
    return;
  }
  window.location.href = result.url;
}