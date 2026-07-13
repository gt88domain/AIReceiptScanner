"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ListingLoadMoreProps = Omit<ComponentProps<"button">, "children"> & {
  hasMore: boolean;
  isLoading?: boolean;
  label?: string;
  loadingLabel?: string;
};

/** Resource adapters decide pagination semantics; this only renders the command. */
export function ListingLoadMore({
  className,
  hasMore,
  isLoading = false,
  label = "Load more",
  loadingLabel = "Loading",
  type = "button",
  ...props
}: ListingLoadMoreProps) {
  if (!hasMore) return null;

  return (
    <button
      type={type}
      className={cn(
        "mx-auto mt-6 flex min-h-10 min-w-40 items-center justify-center border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}
