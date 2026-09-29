import { Suspense } from "react";
import { PremiumView } from "@/components/premium/premium-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function PremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-8">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <PremiumView />
    </Suspense>
  );
}