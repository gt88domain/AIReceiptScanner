import { Skeleton } from "@/components/ui/skeleton";
import { ListingGrid } from "./listing-grid";
import type { ListingGridColumns } from "./listing-types";

type ListingLoadingStateProps = {
  columns?: ListingGridColumns;
  count?: number;
  label?: string;
};

export function ListingLoadingState({
  columns = 3,
  count = 6,
  label = "Loading results",
}: ListingLoadingStateProps) {
  const placeholders = Array.from({ length: count }, (_, index) => ({
    id: `loading-${index}`,
  }));

  return (
    <div aria-busy="true">
      <ListingGrid
        ariaLabel={label}
        columns={columns}
        getItemKey={(placeholder) => placeholder.id}
        items={placeholders}
        renderItem={() => (
          <div className="space-y-3 border p-4">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      />
    </div>
  );
}
