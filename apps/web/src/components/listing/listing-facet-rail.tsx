"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, TagsIcon, XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { FacetOption, ListingCategoryOption, ListingSelectFacet } from "./listing-types";

type ListingCategoryFacet = {
  allChildrenLabel: string;
  allLabel: string;
  label: string;
  onValueChange: (value: string | undefined) => void;
  options: readonly ListingCategoryOption[];
  subcategoryLabel: string;
  value?: string;
};

type ListingTagFacet = {
  label: string;
  onToggle: (value: string) => void;
  options: readonly FacetOption[];
  selectedValues?: readonly string[];
};

type ListingQuickFilters = {
  label: string;
  onValueChange: (value: string | undefined) => void;
  options: readonly FacetOption[];
  value?: string;
};

type ListingFacetRailProps = Omit<ComponentProps<"aside">, "children"> & {
  additionalFiltersLabel?: string;
  category?: ListingCategoryFacet;
  clearLabel?: string;
  onClear?: () => void;
  quickFilters?: ListingQuickFilters;
  selectFacets?: readonly ListingSelectFacet[];
  tags?: ListingTagFacet;
};

/** Standard filter rail. Routes supply labels, route state, taxonomy, and data. */
export function ListingFacetRail({
  additionalFiltersLabel,
  category,
  className,
  clearLabel,
  onClear,
  quickFilters,
  selectFacets = [],
  tags,
  ...props
}: ListingFacetRailProps) {
  const selectedCategory = category?.options.find(
    (option) =>
      option.value === category.value ||
      option.children?.some((child) => child.value === category.value),
  );
  const activeTagValues = new Set(tags?.selectedValues);

  return (
    <aside
      className={cn(
        "space-y-5 rounded-card border border-line bg-surface p-5 text-ink shadow-raised",
        className,
      )}
      {...props}
    >
      {quickFilters ? (
        <section className="space-y-3 border-b border-line pb-5" aria-label={quickFilters.label}>
          <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-ink-muted uppercase">
            {quickFilters.label}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickFilters.options.map((option) => {
              const active = quickFilters.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "min-h-10 rounded-control border px-3 text-sm font-semibold transition-[transform,background,border-color,color] active:translate-y-px",
                    active
                      ? "border-skin-accent bg-skin-accent text-skin-on-accent shadow-sm"
                      : "border-line bg-surface-raised text-ink hover:border-line-strong hover:bg-surface-hover",
                  )}
                  onClick={() => quickFilters.onValueChange(active ? undefined : option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      {category ? (
        <section className="space-y-3" aria-label={category.label}>
          <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-ink-muted uppercase">
            {category.label}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <CategoryButton
              active={!category.value}
              label={category.allLabel}
              onClick={() => category.onValueChange(undefined)}
            />
            {category.options.map((option) => (
              <CategoryButton
                key={option.value}
                active={selectedCategory?.value === option.value}
                icon={option.icon}
                label={option.label}
                onClick={() =>
                  category.onValueChange(
                    selectedCategory?.value === option.value ? undefined : option.value,
                  )
                }
              />
            ))}
          </div>

          {selectedCategory ? (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {category.subcategoryLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <SubcategoryButton
                  active={category.value === selectedCategory.value}
                  label={category.allChildrenLabel}
                  onClick={() => category.onValueChange(selectedCategory.value)}
                />
                {selectedCategory.children?.map((child) => (
                  <SubcategoryButton
                    key={child.value}
                    active={category.value === child.value}
                    label={child.label}
                    onClick={() => category.onValueChange(child.value)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {selectFacets.length > 0 ? (
        <section
          className="space-y-2 border-t border-line pt-4"
          aria-label={additionalFiltersLabel}
        >
          {selectFacets.map((facet) => (
            <FacetSelect key={facet.key} facet={facet} />
          ))}
        </section>
      ) : null}

      {tags ? (
        <details className="group border-t border-line pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <TagsIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              {tags.label}
              {activeTagValues.size > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  ({activeTagValues.size})
                </span>
              ) : null}
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.options.map((option) => {
              const active = activeTagValues.has(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "min-h-8 rounded-control border px-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-skin-accent bg-surface-active text-ink"
                      : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:bg-surface-hover hover:text-ink",
                  )}
                  onClick={() => tags.onToggle(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </details>
      ) : null}

      {onClear && clearLabel ? (
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-surface-active text-sm font-semibold text-skin-accent-ink transition-[transform,background] hover:bg-surface-hover active:translate-y-px"
          onClick={onClear}
        >
          <XIcon aria-hidden="true" className="size-4" />
          {clearLabel}
        </button>
      ) : null}
    </aside>
  );
}

function CategoryButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex min-h-19 flex-col items-center justify-center gap-1 rounded-control border px-1.5 py-2 text-center text-xs font-semibold transition-[transform,background,border-color] active:translate-y-px",
        active
          ? "border-line-strong bg-surface-active text-ink"
          : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:bg-surface-hover hover:text-ink",
      )}
      onClick={onClick}
    >
      {icon ? (
        <span className="size-4" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}

function SubcategoryButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "min-h-8 rounded-control border px-2.5 text-xs font-semibold transition-colors",
        active
          ? "border-skin-accent bg-skin-accent text-skin-on-accent"
          : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:bg-surface-hover hover:text-ink",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function FacetSelect({ facet }: { facet: ListingSelectFacet }) {
  return (
    <label className="relative flex min-h-11 items-center gap-3 rounded-control border border-line bg-surface-raised px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-hover focus-within:border-skin-accent focus-within:ring-2 focus-within:ring-skin-accent/20">
      <span
        className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        {facet.icon}
      </span>
      <select
        aria-label={facet.label}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-6 outline-none"
        value={facet.value ?? ""}
        onChange={(event) => facet.onValueChange(event.target.value || undefined)}
      >
        <option value="">{facet.allLabel}</option>
        {facet.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none size-4 shrink-0 text-muted-foreground"
      />
    </label>
  );
}
