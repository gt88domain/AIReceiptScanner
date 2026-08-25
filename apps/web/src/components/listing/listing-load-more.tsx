"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ListingLoadMoreProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

/** Resource adapters decide pagination semantics; this only renders the command. */
export function ListingLoadMore({
  className,
  label,
  type = "button",
  ...props
}: ListingLoadMoreProps) {
  return (
    <Button
      className={cn(
        "mx-auto mt-8 min-w-40 rounded-full border-line bg-surface px-6 font-semibold text-ink transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-skin-accent hover:bg-skin-accent hover:text-skin-on-accent active:scale-[0.98]",
        className,
      )}
      size="lg"
      type={type}
      variant="outline"
      {...props}
    >
      {label}
    </Button>
  );
}
