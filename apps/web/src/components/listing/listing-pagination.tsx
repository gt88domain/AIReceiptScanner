import { cn, getPageNumbers } from "@/lib/utils";

type ListingPaginationProps = {
  ariaLabel: string;
  className?: string;
  currentPage: number;
  hrefForPage: (page: number) => string;
  nextLabel: string;
  previousLabel: string;
  totalPages: number;
};

/**
 * Crawlable pagination. Routes own URLs, canonical/noindex policy, and data;
 * this component only presents stable anchor links for people and crawlers.
 */
export function ListingPagination({
  ariaLabel,
  className,
  currentPage,
  hrefForPage,
  nextLabel,
  previousLabel,
  totalPages,
}: ListingPaginationProps) {
  if (totalPages < 2) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn("mt-8 flex items-center justify-center gap-1.5", className)}
    >
      {currentPage > 1 ? (
        <a
          className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-line-strong hover:bg-surface-hover"
          href={hrefForPage(currentPage - 1)}
        >
          {previousLabel}
        </a>
      ) : null}

      <ol className="flex items-center gap-1.5" aria-label={ariaLabel}>
        {getPageNumbers(currentPage, totalPages).map((page, index) =>
          typeof page === "number" ? (
            <li key={page}>
              <a
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  page === currentPage
                    ? "border-skin-accent bg-skin-accent text-skin-on-accent shadow-raised"
                    : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-hover",
                )}
                href={hrefForPage(page)}
              >
                {page}
              </a>
            </li>
          ) : (
            <li
              key={`${page}-${index}`}
              aria-hidden="true"
              className="grid size-10 place-items-center text-ink-muted"
            >
              {page}
            </li>
          ),
        )}
      </ol>

      {currentPage < totalPages ? (
        <a
          className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-line-strong hover:bg-surface-hover"
          href={hrefForPage(currentPage + 1)}
        >
          {nextLabel}
        </a>
      ) : null}
    </nav>
  );
}
