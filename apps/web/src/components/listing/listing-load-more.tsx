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
        "mx-auto mt-6 min-w-40 rounded-control border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-hover hover:text-ink",
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
