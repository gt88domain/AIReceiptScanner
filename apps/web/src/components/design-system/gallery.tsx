import { MoonIcon, SlidersHorizontalIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import "./gallery.css";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const skins = ["saas-neutral", "catalog-blue", "dark-entertainment"] as const;
type Skin = (typeof skins)[number];

const skinLabels: Record<Skin, string> = {
  "saas-neutral": "Neutral",
  "catalog-blue": "Catalog",
  "dark-entertainment": "Entertainment",
};

const demoItems = [
  {
    id: "orbit",
    title: "Orbit",
    description: "A reusable card surface with media and action slots.",
    category: "templates",
    featured: true,
    rating: "4.9",
    saves: 418,
    views: "2.6K",
  },
  {
    id: "signal",
    title: "Signal",
    description: "A concise directory card with clear hierarchy.",
    category: "templates",
    featured: true,
    rating: "4.8",
    saves: 326,
    views: "1.3K",
  },
  {
    id: "monograph",
    title: "Monograph",
    description: "A public resource frame with metadata.",
    category: "guides",
    featured: false,
    rating: "4.7",
    saves: 284,
    views: "980",
  },
  {
    id: "beacon",
    title: "Beacon",
    description: "A product-owned item, consistent visual contract.",
    category: "templates",
    featured: false,
    rating: "4.6",
    saves: 231,
    views: "864",
  },
  {
    id: "field-notes",
    title: "Field Notes",
    description: "An editorial guide for focused product research.",
    category: "guides",
    featured: true,
    rating: "4.9",
    saves: 512,
    views: "3.1K",
  },
  {
    id: "atlas",
    title: "Atlas",
    description: "A navigable collection with calm density.",
    category: "templates",
    featured: false,
    rating: "4.5",
    saves: 198,
    views: "742",
  },
  {
    id: "dispatch",
    title: "Dispatch",
    description: "A compact reading surface for timely updates.",
    category: "guides",
    featured: false,
    rating: "4.7",
    saves: 267,
    views: "1.1K",
  },
  {
    id: "prism",
    title: "Prism",
    description: "A visual catalog frame with strong grouping.",
    category: "templates",
    featured: true,
    rating: "4.8",
    saves: 391,
    views: "2.2K",
  },
] as const;

/**
 * Dev-only component gallery. This module is lazy-loaded by the design-system
 * route, which throws notFound() outside development (and outside the template
 * Cloudflare preview build), so none of this renders in production. All copy
 * here documents the components for template developers; it is not product
 * content.
 */
export function DesignSystemGallery() {
  const [skin, setSkin] = useState<Skin>("saas-neutral");
  const [activeTab, setActiveTab] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [visibleCount, setVisibleCount] = useState(4);
  const { userTheme, setTheme } = useTheme();
  const dark = userTheme === "dark";
  const normalizedQuery = submittedQuery.toLocaleLowerCase();
  const filteredItems = demoItems.filter(
    (item) =>
      (activeTab === "all" || item.category === activeTab) &&
      (!featuredOnly || item.featured) &&
      (!normalizedQuery ||
        item.title.toLocaleLowerCase().includes(normalizedQuery) ||
        item.description.toLocaleLowerCase().includes(normalizedQuery)),
  );
  const sortedItems =
    sort === "alphabetical"
      ? [...filteredItems].sort((left, right) => left.title.localeCompare(right.title))
      : filteredItems;
  const visibleItems = sortedItems.slice(0, visibleCount);

  const resetVisibleItems = () => setVisibleCount(4);

  return (
    <div className={cn("bg-page-skin text-ink", `skin-${skin}`)}>
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-[var(--page-top-offset)] pb-24 sm:px-6 lg:px-8">
        <header>
          <p className="font-mono text-xs font-bold tracking-[0.14em] text-skin-accent-ink uppercase">
            Dev only · not in production
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">
            Design system gallery
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
            Every shared public primitive, in every skin. Page frames (ListingPage, RankingPage,
            PublicDetailLayout) compose these pieces and were validated separately. The global
            header above remains product-owned navigation.
          </p>
        </header>

        <div className="sticky top-[calc(var(--header-height)+0.75rem)] z-10 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-surface/80 px-3 py-2 shadow-raised backdrop-blur-sm">
          <div
            aria-label="Skin"
            className="flex items-center gap-1 rounded-full bg-surface-raised p-1"
            role="group"
          >
            {skins.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={skin === option}
                onClick={() => setSkin(option)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  skin === option
                    ? "bg-skin-accent text-skin-on-accent shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {skinLabels[option]}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="inline-flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            {dark ? (
              <SunIcon aria-hidden="true" className="size-4" />
            ) : (
              <MoonIcon aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>

        <GallerySection
          description="Breadcrumbs show location. Optional tabs represent peer result views and render only when a product supplies them."
          index="01"
          title="Hierarchy and tabs"
        >
          <Breadcrumb>
            <BreadcrumbList className="text-ink-muted">
              <BreadcrumbItem>
                <BreadcrumbLink href="/design-system">Resources</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/design-system">Directory</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-ink">Search results</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              resetVisibleItems();
            }}
          >
            <TabsList className="rounded-full bg-surface-raised text-ink-muted">
              <TabsTrigger
                value="all"
                className="rounded-full px-4 data-[state=active]:bg-skin-accent data-[state=active]:text-skin-on-accent"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="rounded-full px-4 data-[state=active]:bg-skin-accent data-[state=active]:text-skin-on-accent"
              >
                Templates
              </TabsTrigger>
              <TabsTrigger
                value="guides"
                className="rounded-full px-4 data-[state=active]:bg-skin-accent data-[state=active]:text-skin-on-accent"
              >
                Guides
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </GallerySection>

        <GallerySection
          description="A route adapter owns query state and appends the next batch in place. The command never navigates, resets scroll, or imposes a total cap."
          index="02"
          title="Search results composition"
        >
          <ListingToolbar
            ariaLabel="Demo controls"
            search={
              <ListingSearchInput
                label="Search"
                onQueryChange={setQuery}
                onSubmit={(value) => {
                  setSubmittedQuery(value);
                  resetVisibleItems();
                }}
                placeholder="Search resources"
                query={query}
                submitLabel="Search"
              />
            }
            sort={
              <ListingSortSelect
                label="Sort"
                onValueChange={setSort}
                options={[
                  { label: "Popular", value: "popular" },
                  { label: "Alphabetical", value: "alphabetical" },
                ]}
                value={sort}
              />
            }
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="More result filters"
                    className="size-11 rounded-full border-line bg-surface-raised text-ink shadow-none"
                    size="icon"
                    variant="outline"
                  >
                    <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={cn("w-52 border-line bg-surface text-ink", `skin-${skin}`)}
                >
                  <DropdownMenuLabel>Result filters</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={featuredOnly}
                    onCheckedChange={(checked) => {
                      setFeaturedOnly(Boolean(checked));
                      resetVisibleItems();
                    }}
                  >
                    Featured only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setFeaturedOnly(false);
                      resetVisibleItems();
                    }}
                  >
                    Clear filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            summary={`${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}`}
          />

          {visibleItems.length > 0 ? (
            <>
              <ListingGrid
                ariaLabel="Search results"
                columns={4}
                getItemKey={(item) => item.id}
                items={visibleItems}
                renderItem={(item, index) => (
                  <ListingMediaCard
                    description={item.description}
                    footer={<DemoStats item={item} />}
                    media={<DemoMedia tone={index} />}
                    mediaAction={<ListingSaveButton label={`Save ${item.title}`} saved={false} />}
                    title={item.title}
                  />
                )}
              />
              {visibleItems.length < sortedItems.length ? (
                <ListingLoadMore
                  label="Load more"
                  onClick={() => setVisibleCount((count) => count + 4)}
                />
              ) : null}
            </>
          ) : (
            <ListingEmptyState
              description="Try another query, tab, or filter."
              title="No results"
            />
          )}

          <div className="rounded-card border border-dashed border-line p-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Crawlable page links remain available when SEO requires them
            </p>
            <ListingPagination
              ariaLabel="Demo pages"
              currentPage={1}
              hrefForPage={(page) => `/design-system?page=${page}`}
              nextLabel="Next"
              previousLabel="Previous"
              totalPages={3}
            />
          </div>
        </GallerySection>

        <GallerySection
          description="Media card, bleed and framed variants."
          index="03"
          title="Cards"
        >
          <ListingGrid
            ariaLabel="Demo cards"
            columns={4}
            getItemKey={(item) => item.id}
            items={demoItems.slice(0, 4)}
            renderItem={(item, index) => (
              <ListingMediaCard
                description={item.description}
                footer={<DemoStats item={item} />}
                media={<DemoMedia tone={index} />}
                mediaAction={<ListingSaveButton label={`Save ${item.title}`} saved={index === 0} />}
                mediaVariant={index % 2 === 0 ? "bleed" : "framed"}
                title={item.title}
              />
            )}
          />
        </GallerySection>

        <GallerySection
          description="Desktop rail; on mobile it moves to a drawer."
          index="04"
          title="Facet rail"
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
          description="Rank numeral first: top 3 accented, the rest muted."
          index="05"
          title="Ranking rows"
        >
          <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-raised">
            {demoItems.slice(0, 4).map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-hover sm:gap-6 sm:px-6"
              >
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

        <GallerySection description="Empty, error, and loading." index="06" title="States">
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
          description="65ch measure, 1.75 line-height, edge-collapsed spacing."
          index="07"
          title="Prose"
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
  index,
  title,
}: {
  children: ReactNode;
  description: string;
  index: string;
  title: string;
}) {
  return (
    <section className="mt-14 border-t border-line pt-8">
      <p className="font-mono text-xs font-bold tracking-[0.14em] text-skin-accent-ink uppercase">
        {index}
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
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

function DemoStats({ item }: { item: (typeof demoItems)[number] }) {
  return (
    <p className="truncate text-xs font-semibold text-ink-muted">
      ★ {item.rating}　♡ {item.saves}　◉ {item.views} views
    </p>
  );
}
