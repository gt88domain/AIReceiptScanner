import type { ReactNode } from "react";
import { ListingShell } from "../listing-shell";

type ListingPageProps = {
  breadcrumbs?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  filterLabel?: string;
  filters?: ReactNode;
  mobileFilters?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
};

/**
 * A route-agnostic page template for category, search, and collection results.
 * The product owns the route, SEO, i18n, data loader, cards, and query state.
 */
export function ListingPage({
  breadcrumbs,
  children,
  description,
  eyebrow,
  filterLabel,
  filters,
  mobileFilters,
  title,
  toolbar,
  className,
}: ListingPageProps) {
  return (
    <ListingShell
      className={className}
      filterLabel={filterLabel}
      filters={filters}
      mobileFilters={mobileFilters}
      toolbar={toolbar}
      header={
        <>
          {breadcrumbs ? (
            <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-muted">
              {breadcrumbs}
            </nav>
          ) : null}
          <div className="relative min-h-52 overflow-hidden rounded-card border border-line bg-hero-skin px-6 py-9 shadow-raised sm:px-10 sm:py-11">
            <div className="pointer-events-none absolute right-[-8%] bottom-[-35%] h-[90%] w-[65%] rotate-[-8deg] rounded-[50%_50%_0_0] border-t border-line" />
            {eyebrow ? (
              <p className="relative z-10 font-mono text-xs font-bold tracking-[0.14em] text-skin-accent-ink uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="relative z-10 mt-3 text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
              {title}
            </h1>
            {description ? (
              <div className="relative z-10 mt-4 max-w-2xl text-base leading-7 text-ink-muted">
                {description}
              </div>
            ) : null}
          </div>
        </>
      }
    >
      {children}
    </ListingShell>
  );
}
