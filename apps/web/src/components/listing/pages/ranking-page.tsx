import type { ReactNode } from "react";
import { ListingRank } from "../listing-rank";
import { ListingPage } from "./listing-page";

type RankingPageProps<TItem> = {
  description?: ReactNode;
  empty: ReactNode;
  eyebrow?: ReactNode;
  filterLabel?: string;
  filters?: ReactNode;
  getItemKey: (item: TItem) => string;
  items: readonly TItem[];
  mobileFilters?: ReactNode;
  /** Accessible label for each rank marker, e.g. (rank) => `Rank ${rank}`. */
  rankLabel: (rank: number) => string;
  rankStart?: number;
  resultsAriaLabel: string;
  renderItem: (item: TItem, context: { index: number; rank: number }) => ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
};

/**
 * A route-agnostic rankings page rendered as ordered rows: the frame owns the
 * rank marker (top 3 emphasized, the rest muted), the adapter supplies an
 * already-ranked slice and each row's content. It never calculates or asserts
 * a ranking policy.
 */
export function RankingPage<TItem>({
  description,
  empty,
  eyebrow,
  filterLabel,
  filters,
  getItemKey,
  items,
  mobileFilters,
  rankLabel,
  rankStart = 1,
  renderItem,
  resultsAriaLabel,
  title,
  toolbar,
}: RankingPageProps<TItem>) {
  return (
    <ListingPage
      description={description}
      eyebrow={eyebrow}
      filterLabel={filterLabel}
      filters={filters}
      mobileFilters={mobileFilters}
      title={title}
      toolbar={toolbar}
    >
      {items.length > 0 ? (
        <ol
          aria-label={resultsAriaLabel}
          className="divide-y divide-line rounded-card border border-line bg-surface shadow-raised"
        >
          {items.map((item, index) => {
            const rank = rankStart + index;

            return (
              <li key={getItemKey(item)} className="flex items-center gap-4 p-4 sm:gap-6 sm:px-6">
                <ListingRank label={rankLabel(rank)} rank={rank} />
                <div className="min-w-0 flex-1">{renderItem(item, { index, rank })}</div>
              </li>
            );
          })}
        </ol>
      ) : (
        empty
      )}
    </ListingPage>
  );
}
