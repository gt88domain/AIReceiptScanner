"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

type FilterDrawerProps = {
  children: ReactNode;
  label: string;
};

/** Mobile-only filter container. Filter state stays with the route that renders it. */
export function FilterDrawer({ children, label }: FilterDrawerProps) {
  return (
    <div className="mb-4 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="w-full rounded-full border-line-strong bg-surface-active text-skin-accent-ink transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-surface-hover"
            type="button"
            variant="outline"
          >
            <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
            {label}
          </Button>
        </SheetTrigger>
        <SheetContent className="max-h-[78dvh] overflow-y-auto rounded-t-xl" side="bottom">
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
