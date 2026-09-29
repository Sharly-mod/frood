"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../lib/session-context";
import { getMaxTournamentParticipants, getRemainingTournaments, incrementDailyTournamentCount } from "../lib/feature-flags";
import { loadSelection, saveSelection, clearSelection as clearStoredSelection } from "../lib/selection";

interface UseTournamentLaunchResult {
  selectedIds: string[];
  maxAllowed: number;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  launch: () => void;
  limitDialogOpen: boolean;
  setLimitDialogOpen: (open: boolean) => void;
  quotaDialogOpen: boolean;
  setQuotaDialogOpen: (open: boolean) => void;
}

export function useTournamentLaunch(): UseTournamentLaunchResult {
  const router = useRouter();
  const { isPremium } = useSession();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => loadSelection());
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);

  const maxAllowed = getMaxTournamentParticipants(isPremium);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      setSelectedIds(next);
      saveSelection(next);
      return;
    }
    if (selectedIds.length >= maxAllowed) {
      setLimitDialogOpen(true);
      return;
    }
    const next = [...selectedIds, id];
    setSelectedIds(next);
    saveSelection(next);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    clearStoredSelection();
  };

  const launch = () => {
    if (selectedIds.length < 2) return;
    if (!isPremium && getRemainingTournaments(isPremium) <= 0) {
      setQuotaDialogOpen(true);
      return;
    }
    if (!isPremium) {
      incrementDailyTournamentCount();
    }
    router.push(`/tournament?ids=${selectedIds.join(",")}`);
  };

  return {
    selectedIds,
    maxAllowed,
    toggleSelect,
    clearSelection,
    launch,
    limitDialogOpen,
    setLimitDialogOpen,
    quotaDialogOpen,
    setQuotaDialogOpen,
  };
}