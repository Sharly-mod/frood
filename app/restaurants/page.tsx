import { Suspense } from "react";
import { RestaurantsView } from "@/components/restaurants/restaurants-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function RestaurantsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl space-y-4 px-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      }
    >
      <RestaurantsView />
    </Suspense>
  );
}