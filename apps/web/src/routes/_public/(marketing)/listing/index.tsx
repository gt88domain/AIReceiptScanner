import { Link, createFileRoute } from "@tanstack/react-router";
import {
  LayoutGridIcon,
  Rows3Icon,
  ShapesIcon,
  StoreIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingEmptyState } from "@/components/listing/listing-empty-state";
import { ListingFacetRail } from "@/components/listing/listing-facet-rail";
import { ListingGrid } from "@/components/listing/listing-grid";
import { ListingSearchInput } from "@/components/listing/listing-search-input";
import { ListingShell } from "@/components/listing/listing-shell";
import { ListingSortSelect } from "@/components/listing/listing-sort-select";
import { ListingToolbar } from "@/components/listing/listing-toolbar";
import { webConfig } from "@/configs/web-config";
import {
  templatePatterns,
  type TemplateCategory,
  type TemplateLayout,
  type TemplateSlug,
} from "@/configs/template-catalog";
import { getCurrentLocale, getMessages, useTranslations } from "@/i18n";
import { buildSeoHead } from "@/utils/seo";

type SortValue = "recommended" | "newest" | "name";

const patternIcons: Record<TemplateSlug, LucideIcon> = {
  directory: StoreIcon,
  marketplace: ShapesIcon,
  resources: TagsIcon,
  changelog: Rows3Icon,
  jobs: Rows3Icon,
  projects: LayoutGridIcon,
};

export const Route = createFileRoute("/_public/(marketing)/listing/")({
  head: () => {
    const locale = getCurrentLocale();
    const messages = getMessages(locale);

    return buildSeoHead({
      locale,
      title: `${messages.listingTemplate.title} | ${webConfig.AppName}`,
      description: messages.listingTemplate.description,
      canonicalPath: "/listing",
      siteName: webConfig.AppName,
    });
  },
  component: ListingTemplatePage,
});

function ListingTemplatePage() {
  const t = useTranslations("listingTemplate");
  const [category, setCategory] = useState<TemplateCategory>();
  const [layout, setLayout] = useState<TemplateLayout>();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("recommended");

  const filteredPatterns = useMemo(() => {
    const normalizedQuery = submittedQuery.toLocaleLowerCase();

    return templatePatterns
      .filter((pattern) => {
        const title = t(`items.${pattern.id}.title`);
        const description = t(`items.${pattern.id}.description`);
        const categoryLabel = t(`items.${pattern.id}.category`);
        const matchesQuery = [title, description, categoryLabel]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);

        return (
          matchesQuery &&
          (!category || pattern.category === category) &&
          (!layout || pattern.layout === layout)
        );
      })
      .sort((left, right) => {
        if (sort === "name") {
          return t(`items.${left.id}.title`).localeCompare(t(`items.${right.id}.title`));
        }

        if (sort === "newest") return right.order - left.order;
        return left.order - right.order;
      });
  }, [category, layout, sort, submittedQuery, t]);

  const clearFilters = () => {
    setCategory(undefined);
    setLayout(undefined);
    setQuery("");
    setSubmittedQuery("");
  };
  const hasFilters = Boolean(category || layout || submittedQuery);

  const filters = (
    <ListingFacetRail
      category={{
        allLabel: t("allCategories"),
        label: t("categoryLabel"),
        onValueChange: (value) => setCategory(value as TemplateCategory | undefined),
        options: [
          { value: "directory", label: t("items.directory.category"), icon: <StoreIcon /> },
          { value: "marketplace", label: t("items.marketplace.category"), icon: <ShapesIcon /> },
          { value: "content", label: t("items.resources.category"), icon: <TagsIcon /> },
        ],
        value: category,
      }}
      clearLabel={t("clearFilters")}
      onClear={hasFilters ? clearFilters : undefined}
      selectFacets={[
        {
          icon: <LayoutGridIcon className="size-4" aria-hidden="true" />,
          key: "layout",
          label: t("layoutLabel"),
          options: [
            { value: "", label: t("allLayouts") },
            { value: "grid", label: t("items.directory.layout") },
            { value: "rows", label: t("items.changelog.layout") },
          ],
          value: layout ?? "",
          onValueChange: (value) => setLayout((value || undefined) as TemplateLayout | undefined),
        },
      ]}
    />
  );

  return (
    <ListingShell
      className="pt-28 pb-16"
      filterLabel={t("filterLabel")}
      filters={filters}
      header={
        <div className="space-y-4 border-b pb-8">
          <Badge variant="outline">{t("eyebrow")}</Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
          </div>
        </div>
      }
      toolbar={
        <ListingToolbar
          ariaLabel={t("filterLabel")}
          search={
            <ListingSearchInput
              label={t("searchLabel")}
              onQueryChange={setQuery}
              onSubmit={setSubmittedQuery}
              placeholder={t("searchPlaceholder")}
              query={query}
            />
          }
          sort={
            <ListingSortSelect
              label={t("sortLabel")}
              onValueChange={(value) => setSort(value as SortValue)}
              options={[
                { value: "recommended", label: t("sortRecommended") },
                { value: "newest", label: t("sortNewest") },
                { value: "name", label: t("sortName") },
              ]}
              value={sort}
            />
          }
          summary={t("resultCount", { count: filteredPatterns.length })}
        />
      }
    >
      {filteredPatterns.length > 0 ? (
        <ListingGrid
          ariaLabel={t("title")}
          columns={3}
          getItemKey={(pattern) => pattern.id}
          items={filteredPatterns}
          renderItem={(pattern) => <PatternCard pattern={pattern} />}
        />
      ) : (
        <ListingEmptyState description={t("emptyDescription")} title={t("emptyTitle")} />
      )}
    </ListingShell>
  );
}

function PatternCard({ pattern }: { pattern: (typeof templatePatterns)[number] }) {
  const t = useTranslations("listingTemplate");
  const Icon = patternIcons[pattern.id];

  return (
    <Card className="h-full rounded-lg transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
        <CardTitle>{t(`items.${pattern.id}.title`)}</CardTitle>
        <CardDescription>{t(`items.${pattern.id}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t(`items.${pattern.id}.category`)}</Badge>
        <Badge variant="outline">{t(`items.${pattern.id}.layout`)}</Badge>
        <Button asChild className="ml-auto" size="sm" variant="outline">
          <Link params={{ slug: pattern.id }} to="/listing/$slug">
            {t("viewDetails")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
