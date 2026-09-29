"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { useSession } from "@/lib/session-context";
import { listUsers, setLifetimePremium, type AdminUser } from "@/services/adminService";
import { cn, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function AdminView() {
  const router = useRouter();
  const { isAdmin, isSupabaseEnabled, profile } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin || !isSupabaseEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (error) {
      toast(error instanceof Error ? error.message : "Impossible de charger les utilisateurs.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSupabaseEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGrant(user: AdminUser, value: boolean) {
    setBusyId(user.id);
    try {
      await setLifetimePremium(user.id, value);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, premiumLifetime: value } : u)));
      toast(value ? `Premium à vie accordé à ${user.email ?? user.displayName}` : `Premium retiré à ${user.email ?? user.displayName}`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (!isSupabaseEnabled) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          emoji="🔐"
          title="Admin indisponible en mode mock"
          description="Configure Supabase (.env.local) pour gérer les comptes et le Premium."
          action={
            <a href="https://supabase.com" target="_blank" rel="noreferrer">
              <Button size="lg">Configurer Supabase</Button>
            </a>
          }
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          emoji="⛔"
          title="Accès réservé"
          description="Tu n'es pas administrateur. Cette page est privée."
          action={
            <Button size="lg" variant="outline" onClick={() => router.push("/")}>
              Retour à l'accueil
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight md:text-3xl">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecté en tant qu'admin {profile?.email ? `(${profile.email})` : ""} — accorde le Premium à vie à qui tu veux, sans paiement.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
        Le Premium à vie est indépendant des abonnements Stripe — il ne sera jamais annulé par un webhook.
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState emoji="👥" title="Aucun utilisateur" description="Crée d'abord des comptes depuis l'écran de connexion." />
      ) : (
        <ul className="space-y-3">
          {users.map((user) => {
            const isMe = user.id === profile?.id;
            return (
              <li
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-black text-primary">
                  {(user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    {user.displayName ?? "Sans nom"}
                    {isMe ? <span className="text-xs font-normal text-muted-foreground">(toi)</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email ?? "—"} · inscrit {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="success"
                    className={cn(!user.premiumLifetime && "hidden")}
                  >
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Premium à vie
                  </Badge>
                  <Badge variant={user.isAdmin ? "default" : "outline"}>
                    {user.isAdmin ? "Admin" : "Utilisateur"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={user.premiumLifetime ? "outline" : "soft"}
                    disabled={busyId === user.id || isMe}
                    onClick={() => void handleGrant(user, !user.premiumLifetime)}
                  >
                    {user.premiumLifetime ? "Retirer le Premium" : "Donner Premium à vie"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-4 w-4" aria-hidden="true" />
        Le premier admin se déclare en SQL : <code className="rounded bg-muted px-1.5 py-0.5">update public.profiles set is_admin = true where id = &apos;ton-uuid&apos;;</code>
      </p>
    </div>
  );
}