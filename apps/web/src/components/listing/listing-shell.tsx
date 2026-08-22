import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { FilterDrawer } from "./filter-drawer";

type ListingShellProps = Omit<ComponentProps<"main">, "children"> & {
  children: ReactNode;
  filterLabel?: string;
  filters?: ReactNode;
  header?: ReactNode;
  mobileFilters?: ReactNode;
  toolbar?: ReactNode;
};

/** Shared list layout. Routes own their filters, cards, result controls, and data. */
export function ListingShell({
  children,
  className,
  filterLabel,
  filters,
  header,
  mobileFilters,
  toolbar,
  ...props
}: ListingShellProps) {
  const resolvedMobileFilters = mobileFilters ?? filters;

  return (
    <main
      className={cn("min-h-[calc(100dvh_-_var(--header-height))] bg-page-skin text-ink", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-[var(--page-top-offset)] pb-16 sm:px-6 lg:px-8">
        {resolvedMobileFilters && filterLabel ? (
          <FilterDrawer label={filterLabel}>{resolvedMobileFilters}</FilterDrawer>
        ) : null}

        <div
          className={cn(
            "min-w-0",
            filters && "grid gap-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]",
          )}
        >
          {filters ? (
            <aside className="hidden h-fit lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:block">
              {filters}
            </aside>
          ) : null}

          <div className="min-w-0 space-y-5">
            {header ? <header>{header}</header> : null}
            {toolbar}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
