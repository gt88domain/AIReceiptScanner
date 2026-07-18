"use client";

import type { ReactNode } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
          <Button className="w-full" type="button" variant="outline">
            <SlidersHorizontalIcon className="size-4" />
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
