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

/** Stable URL and query value. Never use the display label here. */
export type FacetOption = {
  value: string;
  label: string;
  count?: number;
};

/** A top-level category may reveal a resource-owned child taxonomy. */
export type ListingCategoryOption = FacetOption & {
  children?: readonly FacetOption[];
  icon?: ReactNode;
};

export type ListingSelectFacet = {
  allLabel: string;
  icon: ReactNode;
  key: string;
  label: string;
  onValueChange: (value: string | undefined) => void;
  options: readonly FacetOption[];
  value?: string;
};

export type ListingGridColumns = 1 | 2 | 3 | 4;

export type ListingSortOption = {
  value: string;
  label: string;
};
