import type { ReactNode } from "react";

export type ListingQueryCore = {
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  view?: "grid" | "list";
};
export type ListingResult<TItem> = {
  items: TItem[];
  total?: number;
};

export type FacetOption = {
  /** Stable URL and query value. Never use the display label for this field. */
  value: string;
  label: string;
  count?: number;
};

/** A top-level category may reveal a small, resource-owned child taxonomy. */
export type ListingCategoryOption = FacetOption & {
  children?: readonly FacetOption[];
  icon?: ReactNode;
};

/**
 * Presentation contract for a single-value native select. The resource
 * adapter owns the option values and URL update that happens on change.
 */
export type ListingSelectFacet = {
  allLabel?: string;
  icon: ReactNode;
  key: string;
  label: string;
  onValueChange: (value: string | undefined) => void;
  options: readonly FacetOption[];
  value?: string;
};

export type ListingGridColumns = 1 | 2 | 3 | 4;

export type ListingSortOption = {
  /** Stable, non-empty URL/query value. */
  value: string;
  label: string;
};
