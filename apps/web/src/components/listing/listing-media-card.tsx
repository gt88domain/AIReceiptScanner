import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ListingMediaCardProps = {
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  mediaAction?: ReactNode;
  mediaVariant?: "bleed" | "framed";
  title: ReactNode;
};

/**
 * A catalog card with product-provided media and actions. It deliberately makes
 * no assumption about resource type, price, destination, or favorite behavior.
 */
export function ListingMediaCard({
  action,
  badge,
  className,
  description,
  footer,
  media,
  mediaAction,
  mediaVariant = "bleed",
  title,
}: ListingMediaCardProps) {
  const bleedMedia = mediaVariant === "bleed";

  return (
    <article
      className={cn(
        "group flex h-full min-w-0 flex-col rounded-card border border-line bg-surface text-ink shadow-raised transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised-hover",
        bleedMedia ? "overflow-hidden" : "p-3",
        className,
      )}
    >
      {media ? (
        <div
          className={cn(
            "relative grid aspect-[1.35] place-items-center overflow-hidden bg-surface-raised",
            bleedMedia ? "border-b border-line" : "rounded-control border border-line p-4",
          )}
        >
          {media}
          {mediaAction ? <div className="absolute top-3 right-3">{mediaAction}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0", bleedMedia ? "px-5 pt-5" : media && "mt-4")}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-bold tracking-tight">{title}</h2>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {description ? (
          <div className="mt-2 text-sm leading-5 text-ink-muted">{description}</div>
        ) : null}
      </div>
      {footer || action ? (
        <div
          className={cn(
            "mt-auto flex items-center justify-between gap-3 border-t border-line pt-4",
            bleedMedia ? "mx-5 mb-5" : "mt-5",
          )}
        >
          <div className="min-w-0">{footer}</div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </article>
  );
}
