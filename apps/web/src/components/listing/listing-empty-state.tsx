import { SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";

type ListingEmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function ListingEmptyState({ action, description, title }: ListingEmptyStateProps) {
  return (
    <section className="flex min-h-56 flex-col items-center justify-center border border-dashed px-6 py-10 text-center">
      <SearchXIcon aria-hidden="true" className="mb-3 size-6 text-muted-foreground" />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
