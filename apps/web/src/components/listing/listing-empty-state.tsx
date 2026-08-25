import { SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";

type ListingEmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function ListingEmptyState({ action, description, title }: ListingEmptyStateProps) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-card border border-line bg-surface-raised px-6 py-12 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-full bg-surface-active text-ink-muted">
        <SearchXIcon aria-hidden="true" className="size-5" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
