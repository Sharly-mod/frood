"use client";

import { Trophy, X } from "lucide-react";

interface LaunchBarProps {
  count: number;
  onLaunch: () => void;
  onClear: () => void;
}

export function LaunchBar({ count, onLaunch, onClear }: LaunchBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
      <div className="flex w-full max-w-sm items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          aria-label="Tout désélectionner"
          title="Tout désélectionner"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-lg transition-transform active:scale-90 hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onLaunch}
          className="flex flex-1 items-center justify-between gap-3 rounded-full bg-primary px-6 py-4 text-white shadow-xl transition-transform active:scale-[0.98] cursor-pointer"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Trophy className="h-5 w-5" aria-hidden="true" />
            Lancer le tournoi
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
            {count} sélectionné{count > 1 ? "s" : ""}
          </span>
        </button>
      </div>
    </div>
  );
}