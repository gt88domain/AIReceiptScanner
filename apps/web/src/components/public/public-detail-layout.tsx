import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PublicDetailLayoutProps = {
  actions?: ReactNode;
  aside?: ReactNode;
  breadcrumbs?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  related?: ReactNode;
  title: ReactNode;
  visual?: ReactNode;
};

/**
 * Shared public-detail page frame for resources such as games, domains, and
 * tools. Products own the route, SEO, fields, actions, and related-data query.
 */
export function PublicDetailLayout({
  actions,
  aside,
  breadcrumbs,
  children,
  className,
  description,
  eyebrow,
  metadata,
  related,
  title,
  visual,
}: PublicDetailLayoutProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-4 pt-[var(--page-top-offset)] pb-16 sm:px-6 lg:px-8",
        className,
      )}
    >
      {breadcrumbs ? <nav aria-label="Breadcrumb">{breadcrumbs}</nav> : null}

      <header className="mt-5 grid gap-7 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {eyebrow ? (
            <div className="font-mono text-xs font-bold tracking-[0.14em] text-skin-accent-ink uppercase">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{title}</h1>
          {description ? (
            <div className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</div>
          ) : null}
          {metadata ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {metadata}
            </div>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
        </div>
        {visual ? <div className="min-w-0">{visual}</div> : null}
      </header>

      <div className={cn("mt-8 min-w-0", aside && "grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <article className="min-w-0">{children}</article>
        {aside ? (
          <aside className="h-fit w-full min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
            {aside}
          </aside>
        ) : null}
      </div>

      {related ? <section className="mt-14 border-t pt-10">{related}</section> : null}
    </main>
  );
}
