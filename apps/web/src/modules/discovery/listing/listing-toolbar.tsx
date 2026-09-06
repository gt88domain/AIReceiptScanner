import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type ListingToolbarProps = Omit<ComponentProps<"section">, "children"> & {
  actions?: ReactNode;
  ariaLabel?: string;
  search?: ReactNode;
  sort?: ReactNode;
  summary?: ReactNode;
};

/**
 * Layout-only result controls. Resources supply the actual search and sort
 * controls so their URL state and semantics remain local.
 */
export function ListingToolbar({
  actions,
  ariaLabel = "Result controls",
  className,
  search,
  sort,
  summary,
  ...props
}: ListingToolbarProps) {
  if (!search && !summary && !sort && !actions) return null;

  return (
    <section
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-3 border-y py-3", className)}
      {...props}
    >
      {search ? <div className="w-full min-w-0 max-w-xl sm:w-[28rem]">{search}</div> : null}
      {summary ? <div className="text-sm text-muted-foreground">{summary}</div> : null}
      {sort ? <div className="ml-auto">{sort}</div> : null}
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </section>
  );
}
