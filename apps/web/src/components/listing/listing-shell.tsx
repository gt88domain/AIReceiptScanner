import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { FilterDrawer } from "./filter-drawer";

type ListingShellProps = Omit<ComponentProps<"main">, "children"> & {
  header?: ReactNode;
  filters?: ReactNode;
  mobileFilters?: ReactNode;
  filterLabel?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

/**
 * Shared list layout. Routes provide their filters, cards, and result controls through slots.
 */
export function ListingShell({
  children,
  className,
  filterLabel = "Filters",
  filters,
  header,
  mobileFilters,
  toolbar,
  ...props
}: ListingShellProps) {
  const resolvedMobileFilters = mobileFilters ?? filters;

  return (
    <main
      className={cn("mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {resolvedMobileFilters ? (
        <FilterDrawer label={filterLabel}>{resolvedMobileFilters}</FilterDrawer>
      ) : null}

      <div className={cn("min-w-0", filters && "grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]")}>
        {filters ? (
          <aside className="hidden h-fit lg:sticky lg:top-20 lg:block">{filters}</aside>
        ) : null}

        <div className="min-w-0 space-y-5">
          {header ? <header>{header}</header> : null}
          {toolbar}
          {children}
        </div>
      </div>
    </main>
  );
}
