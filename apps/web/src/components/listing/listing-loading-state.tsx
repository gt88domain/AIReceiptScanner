import { Skeleton } from "@/components/ui/skeleton";
import { ListingGrid } from "./listing-grid";
import type { ListingGridColumns } from "./listing-types";

type ListingLoadingStateProps = {
  columns?: ListingGridColumns;
  count?: number;
};

export function ListingLoadingState({ columns = 3, count = 6 }: ListingLoadingStateProps) {
  return (
    <ListingGrid
      columns={columns}
      getItemKey={(index) => String(index)}
      items={Array.from({ length: count }, (_, index) => index)}
      renderItem={() => (
        <div className="space-y-3 rounded-card border border-line bg-surface p-3">
          <Skeleton className="aspect-[16/9] w-full rounded-control" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
    />
  );
}
