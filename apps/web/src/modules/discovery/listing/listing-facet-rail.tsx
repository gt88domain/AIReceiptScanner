"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, TagsIcon, XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { FacetOption, ListingCategoryOption, ListingSelectFacet } from "./listing-types";

type ListingCategoryFacet = {
  allLabel?: string;
  label?: string;
  onValueChange: (value: string | undefined) => void;
  options: readonly ListingCategoryOption[];
  value?: string;
};

type ListingTagFacet = {
  label?: string;
  onToggle: (value: string) => void;
  options: readonly FacetOption[];
  selectedValues?: readonly string[];
};

type ListingFacetRailProps = Omit<ComponentProps<"aside">, "children"> & {
  category?: ListingCategoryFacet;
  clearLabel?: string;
  onClear?: () => void;
  selectFacets?: readonly ListingSelectFacet[];
  tags?: ListingTagFacet;
};

/**
 * Standard Discovery filter shell. It deliberately has no knowledge of cards,
 * route schemas, or data sources; each resource adapter supplies those.
 */
export function ListingFacetRail({
  category,
  className,
  clearLabel = "Clear all filters",
  onClear,
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
      className={cn("space-y-5 rounded-lg border bg-card p-4 shadow-sm", className)}
      {...props}
    >
      {category ? (
        <section className="space-y-3" aria-label={category.label ?? "Category"}>
          <h2 className="text-sm font-semibold text-foreground">{category.label ?? "Category"}</h2>
          <div className="grid grid-cols-3 gap-2">
            <CategoryButton
              active={!category.value}
              label={category.allLabel ?? "All"}
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
              <p className="text-xs font-semibold text-muted-foreground">Subcategory</p>
              <div className="flex flex-wrap gap-2">
                <SubcategoryButton
                  active={category.value === selectedCategory.value}
                  label={`All ${selectedCategory.label}`}
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
        <section className="space-y-2" aria-label="Additional filters">
          {selectFacets.map((facet) => (
            <FacetSelect key={facet.key} facet={facet} />
          ))}
        </section>
      ) : null}

      {tags ? (
        <details className="group border-t pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <TagsIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              {tags.label ?? "Tags"}
              {activeTagValues.size > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  ({activeTagValues.size})
                </span>
              ) : null}
            </span>
            <ChevronDownIcon
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
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
                    "min-h-8 border px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
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

      {onClear ? (
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-center gap-2 border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
          onClick={onClear}
        >
          <XIcon className="size-4" aria-hidden="true" />
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
        "flex min-h-18 flex-col items-center justify-center gap-1 border px-1.5 py-2 text-center text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground",
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
        "min-h-8 border px-2.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function FacetSelect({ facet }: { facet: ListingSelectFacet }) {
  return (
    <label className="relative flex min-h-12 items-center gap-3 border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
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
        <option value="">{facet.allLabel ?? `${facet.label}: All`}</option>
        {facet.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}
