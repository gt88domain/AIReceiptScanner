import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { ListingGridColumns } from "./listing-types";

const gridColumns: Record<ListingGridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

type ListingGridProps<TItem> = {
  ariaLabel?: string;
  className?: string;
  columns?: ListingGridColumns;
  getItemKey: (item: TItem) => string;
  items: readonly TItem[];
  renderItem: (item: TItem, index: number) => ReactNode;
};

export function ListingGrid<TItem>({
  ariaLabel,
  className,
  columns = 3,
  getItemKey,
  items,
  renderItem,
}: ListingGridProps<TItem>) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn("grid gap-4", gridColumns[columns], className)}
      role="list"
    >
      {items.map((item, index) => (
        <div key={getItemKey(item)} role="listitem">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
