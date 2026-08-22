import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ListingRankProps = Omit<ComponentProps<"span">, "children"> & {
  label: string;
  rank: number;
};

/**
 * The rank numeral is the first visual element of a ranking row: top 3 are
 * emphasized in the skin accent ink, the rest stay muted. Products decide what
 * the number represents; the marker is presentational only.
 */
export function ListingRank({ className, label, rank, ...props }: ListingRankProps) {
  const podium = rank >= 1 && rank <= 3;

  return (
    <span
      className={cn("inline-flex w-12 shrink-0 items-center justify-center", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "font-mono leading-none font-bold tabular-nums",
          podium ? "text-3xl text-skin-accent-ink" : "text-xl text-ink-muted",
        )}
      >
        {rank}
      </span>
    </span>
  );
}
