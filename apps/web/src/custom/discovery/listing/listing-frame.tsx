"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type ListingFrameProps = Omit<ComponentProps<"main">, "children"> & {
  header?: ReactNode;
  filters?: ReactNode;
  mobileFilters?: ReactNode;
  filterLabel?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

/**
 * Shared public-list layout. Resource adapters provide all product-specific
 * filters, cards, and result controls through slots.
 */
export function ListingFrame({
  children,
  className,
  filterLabel = "Filters",
  filters,
  header,
  mobileFilters,
  toolbar,
  ...props
}: ListingFrameProps) {
  const resolvedMobileFilters = mobileFilters ?? filters;

  return (
    <main
      className={cn("mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {resolvedMobileFilters ? (
        <div className="mb-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="w-full">
                <SlidersHorizontalIcon className="size-4" />
                {filterLabel}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] overflow-y-auto sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{filterLabel}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">{resolvedMobileFilters}</div>
            </SheetContent>
          </Sheet>
        </div>
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
