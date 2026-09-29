"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useSession } from "@/lib/session-context";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthView({ mode: initialMode }: { mode: Mode }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const isLogin = mode === "login";

  function switchMode(newMode: Mode) {
    setMode(newMode);
    window.history.replaceState(null, "", newMode === "login" ? "/auth/login" : "/auth/signup");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();

    if (!supabase) {
      toast("L'authentification nécessite Supabase.", "info");
      return;
    }

    if (!email || !password) {
      toast("Remplis ton email et ton mot de passe.", "error");
      return;
    }

    setSubmitting(true);
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      toast(isLogin ? "Email ou mot de passe incorrect." : "Impossible de créer le compte.", "error");
      setSubmitting(false);
      return;
    }

    if (!isLogin && result.data.session === null) {
      toast("Compte créé ! Vérifie ton email pour l'activer.", "success");
      setSubmitting(false);
      return;
    }

    await refresh();
    router.push("/profile");
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      toast("L'authentification nécessite Supabase.", "info");
      return;
    }
    setOauthLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/profile`, queryParams: { access_type: "offline", prompt: "consent" } },
    });
    if (error) {
      toast("Impossible de continuer avec Google.", "error");
      setOauthLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md px-4 py-12">
      <div className="w-full">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight">
            {isLogin ? "Bon retour !" : "Rejoins Frood"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Connecte-toi pour retrouver ton profil." : "Crée ton compte en 30 secondes."}
          </p>
        </div>

        {/* Tab switcher: Connexion vs Inscription */}
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "cursor-pointer rounded-xl py-2 text-sm font-semibold transition-all",
              isLogin
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={cn(
              "cursor-pointer rounded-xl py-2 text-sm font-semibold transition-all",
              !isLogin
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            S'inscrire
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <Input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Mot de passe"
            minLength={6}
          />
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {isLogin ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => void handleGoogle()} disabled={oauthLoading}>
          {oauthLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <span aria-hidden="true">G</span>}
          Continuer avec Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà membre ?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
              >
                Se connecter
              </button>
            </>
          )}
        </p>

        <p className={cn("mt-4 text-center text-xs text-muted-foreground")}>
          L'authentification n'est pas obligatoire pour utiliser Frood.
        </p>
      </div>
    </div>
  );
}