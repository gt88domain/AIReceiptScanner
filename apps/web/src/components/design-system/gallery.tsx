import { MoonIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Prose } from "@/components/content/prose";
import { ListingEmptyState } from "@/components/listing/listing-empty-state";
import { ListingErrorState } from "@/components/listing/listing-error-state";
import { ListingFacetRail } from "@/components/listing/listing-facet-rail";
import { ListingGrid } from "@/components/listing/listing-grid";
import { ListingLoadMore } from "@/components/listing/listing-load-more";
import { ListingLoadingState } from "@/components/listing/listing-loading-state";
import { ListingMediaCard } from "@/components/listing/listing-media-card";
import { ListingPagination } from "@/components/listing/listing-pagination";
import { ListingRank } from "@/components/listing/listing-rank";
import { ListingSaveButton } from "@/components/listing/listing-save-button";
import { ListingSearchInput } from "@/components/listing/listing-search-input";
import { ListingSortSelect } from "@/components/listing/listing-sort-select";
import { ListingToolbar } from "@/components/listing/listing-toolbar";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

const skins = ["saas-neutral", "catalog-blue", "dark-entertainment"] as const;
type Skin = (typeof skins)[number];

const demoItems = [
  {
    id: "orbit",
    title: "Orbit",
    description: "A reusable card surface with media and action slots.",
  },
  { id: "signal", title: "Signal", description: "A concise directory card with clear hierarchy." },
  { id: "monograph", title: "Monograph", description: "A public resource frame with metadata." },
  {
    id: "beacon",
    title: "Beacon",
    description: "A product-owned item, consistent visual contract.",
  },
] as const;

/**
 * Dev-only component gallery. This module is lazy-loaded by the design-system
 * route, which throws notFound() outside development, so none of this renders
 * in production. All copy here documents the components for template
 * developers; it is not product content.
 */
export function DesignSystemGallery() {
  const [skin, setSkin] = useState<Skin>("saas-neutral");
  const { userTheme, setTheme } = useTheme();
  const dark = userTheme === "dark";

  return (
    <div className={cn("bg-page-skin text-ink", `skin-${skin}`)}>
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-[var(--page-top-offset)] pb-24 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.14em] text-skin-accent-ink uppercase">
              Dev only · not in production
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Design system gallery</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Every shared public primitive, in every skin. Page frames (ListingPage, RankingPage,
              PublicDetailLayout) compose these pieces and were validated separately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {skins.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={skin === option}
                onClick={() => setSkin(option)}
                className={cn(
                  "min-h-9 rounded-control border px-3 text-xs font-semibold transition-colors",
                  skin === option
                    ? "border-skin-accent bg-skin-accent text-skin-on-accent"
                    : "border-line bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink",
                )}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(dark ? "light" : "dark")}
              className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {dark ? (
                <SunIcon aria-hidden="true" className="size-4" />
              ) : (
                <MoonIcon aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </header>

        <GallerySection title="Controls" description="Search, sort, save, load more, pagination.">
          <ListingToolbar
            ariaLabel="Demo controls"
            search={
              <ListingSearchInput
                label="Search"
                onQueryChange={() => undefined}
                onSubmit={() => undefined}
                placeholder="Search resources"
                query=""
                submitLabel="Search"
              />
            }
            sort={
              <ListingSortSelect
                label="Sort"
                onValueChange={() => undefined}
                options={[
                  { label: "Newest", value: "newest" },
                  { label: "Alphabetical", value: "alphabetical" },
                ]}
                value="newest"
              />
            }
            summary="4 results"
          />
          <div className="flex flex-wrap items-center gap-3">
            <ListingSaveButton label="Save Orbit" saved={false} />
            <ListingSaveButton label="Remove Orbit" saved />
            <ListingLoadMore label="Load more" />
          </div>
          <ListingPagination
            ariaLabel="Demo pages"
            currentPage={1}
            hrefForPage={() => "#"}
            nextLabel="Next"
            previousLabel="Previous"
            totalPages={3}
          />
        </GallerySection>

        <GallerySection title="Cards" description="Media card, bleed and framed variants.">
          <ListingGrid
            ariaLabel="Demo cards"
            columns={4}
            getItemKey={(item) => item.id}
            items={demoItems}
            renderItem={(item, index) => (
              <ListingMediaCard
                description={item.description}
                media={<DemoMedia tone={index} />}
                mediaAction={<ListingSaveButton label={`Save ${item.title}`} saved={index === 0} />}
                mediaVariant={index % 2 === 0 ? "bleed" : "framed"}
                title={item.title}
              />
            )}
          />
        </GallerySection>

        <GallerySection
          title="Facet rail"
          description="Desktop rail; on mobile it moves to a drawer."
        >
          <div className="max-w-sm">
            <ListingFacetRail
              category={{
                allChildrenLabel: "All",
                allLabel: "All",
                label: "Category",
                onValueChange: () => undefined,
                options: [
                  {
                    children: [
                      { label: "Writing", value: "writing" },
                      { label: "Design", value: "design" },
                    ],
                    label: "Product",
                    value: "product",
                  },
                  { label: "Research", value: "research" },
                  { label: "Creative", value: "creative" },
                ],
                subcategoryLabel: "Subcategory",
                value: "product",
              }}
              clearLabel="Clear filters"
              onClear={() => undefined}
              quickFilters={{
                label: "Quick filters",
                onValueChange: () => undefined,
                options: [
                  { label: "New", value: "new" },
                  { label: "Popular", value: "popular" },
                ],
                value: "new",
              }}
              tags={{
                label: "Tags",
                onToggle: () => undefined,
                options: [
                  { label: "Editorial", value: "editorial" },
                  { label: "Interactive", value: "interactive" },
                ],
                selectedValues: ["editorial"],
              }}
            />
          </div>
        </GallerySection>

        <GallerySection
          title="Ranking rows"
          description="Rank numeral first: top 3 accented, the rest muted."
        >
          <ol className="divide-y divide-line rounded-card border border-line bg-surface shadow-raised">
            {demoItems.map((item, index) => (
              <li key={item.id} className="flex items-center gap-4 p-4 sm:gap-6 sm:px-6">
                <ListingRank label={`Rank ${index + 1}`} rank={index + 1} />
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="hidden size-16 shrink-0 place-items-center rounded-control border border-line bg-hero-skin sm:grid">
                    <SparklesIcon aria-hidden="true" className="size-6 text-skin-accent-ink" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold">{item.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{item.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </GallerySection>

        <GallerySection title="States" description="Empty, error, and loading.">
          <div className="grid gap-4 lg:grid-cols-3">
            <ListingEmptyState
              description="Try changing the query or filters."
              title="No results"
            />
            <ListingErrorState
              description="The request failed."
              onRetry={() => undefined}
              retryLabel="Retry"
              title="Something went wrong"
            />
            <ListingLoadingState columns={1} count={1} />
          </div>
        </GallerySection>

        <GallerySection
          title="Prose"
          description="65ch measure, 1.75 line-height, edge-collapsed spacing."
        >
          <div className="rounded-card border border-line bg-surface p-6 shadow-raised sm:p-10">
            <Prose>
              <h2>Reading surface</h2>
              <p>
                A token-driven surface for articles, answers, and chapters. Links like{" "}
                <a href="#gallery">skin accent ink</a> stay readable in both themes.
              </p>
              <h3>Code</h3>
              <p>
                Inline <code>--color-skin-accent</code> and blocks:
              </p>
              <pre>
                <code>{`.skin-catalog-blue {\n  --skin-accent: #2f7dd3;\n}`}</code>
              </pre>
              <h3>Table</h3>
              <table>
                <thead>
                  <tr>
                    <th>Surface</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Reading</td>
                    <td>Template</td>
                  </tr>
                  <tr>
                    <td>Content model</td>
                    <td>Product</td>
                  </tr>
                </tbody>
              </table>
              <hr />
              <blockquote>Content stays with the product; the surface stays shared.</blockquote>
            </Prose>
          </div>
        </GallerySection>
      </div>
    </div>
  );
}

function GallerySection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function DemoMedia({ tone }: { tone: number }) {
  return (
    <div className="grid size-full place-items-center bg-hero-skin p-6">
      <div
        className="grid aspect-square w-4/5 place-items-center rounded-[28%_72%_57%_43%] border border-line bg-surface-raised shadow-raised"
        style={{ transform: `rotate(${tone * 7 - 9}deg)` }}
      >
        <SparklesIcon aria-hidden="true" className="size-10 text-skin-accent-ink" />
      </div>
    </div>
  );
}
