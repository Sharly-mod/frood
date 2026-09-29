import { Suspense } from "react";
import { TournamentView } from "@/components/tournament/tournament-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-3 px-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <TournamentView />
    </Suspense>
  );
}