"use client";

import { BookOpenIcon, CalendarIcon, EyeIcon, FileTextIcon, UsersIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { ListingEmptyState } from "@/modules/discovery/listing/listing-empty-state";
import { ListingFacetRail } from "@/modules/discovery/listing/listing-facet-rail";
import { ListingFrame } from "@/modules/discovery/listing/listing-frame";
import { ListingGrid } from "@/modules/discovery/listing/listing-grid";
import { ListingLoadMore } from "@/modules/discovery/listing/listing-load-more";
import { ListingSearchInput } from "@/modules/discovery/listing/listing-search-input";
import { ListingSortSelect } from "@/modules/discovery/listing/listing-sort-select";
import { ListingToolbar } from "@/modules/discovery/listing/listing-toolbar";
import { useOrpc } from "@/hooks/use-orpc";
import type { PublicNovelListResult } from "@/modules/novels/list-loader";
import { novelCategories, novelTagCounts } from "@/modules/novels/taxonomy";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
export type NovelSearch = {
  audience?: "for-male" | "for-female" | "for-lgbt";
  category?: string;
  q?: string;
  sort?: "latest" | "popular" | "updated" | "chapters";
  status?: "ongoing" | "completed" | "hiatus";
  tag?: string;
  words?: "lt300k" | "300k-1m" | "gt1m";
};

type NovelLibraryProps = {
  description?: string;
  fixedCategory?: string;
  fixedTag?: string;
  heading?: string;
  initialResult?: PublicNovelListResult;
  onSearchChange: (next: NovelSearch) => void;
  search: NovelSearch;
};

export const novelSearchSchema = z.object({
  audience: z.enum(["for-male", "for-female", "for-lgbt"]).optional(),
  category: z.string().max(80).optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(["latest", "popular", "updated", "chapters"]).optional(),
  status: z.enum(["ongoing", "completed", "hiatus"]).optional(),
  tag: z.string().max(80).optional(),
  words: z.enum(["lt300k", "300k-1m", "gt1m"]).optional(),
});

type NovelListItem = {
  coverUrl: string | null;
  genre: string;
  slug: string;
  status: string;
  summary: string;
  tags: string[];
  title: string;
  totalChapters: number;
  totalWords: number;
  updatedAt: Date;
  viewsCount: number;
};

export function NovelLibrary({
  description = "Browse serialized AI-generated novels by genre, popularity, and recent updates.",
  fixedCategory,
  fixedTag,
  heading = "Find your next AI story",
  initialResult,
  onSearchChange,
  search,
}: NovelLibraryProps) {
  const orpc = useOrpc();
  const [draftQuery, setDraftQuery] = useState(search.q ?? "");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const input = useMemo(
    () => ({
      ...search,
      category: fixedCategory ?? search.category,
      tag: fixedTag ?? search.tag,
      limit: 48,
      sort: search.sort ?? "latest",
    }),
    [fixedCategory, fixedTag, search],
  );
  const [result, setResult] = useState<{ items: NovelListItem[]; total: number } | null>(
    initialResult ?? null,
  );
  const [loadError, setLoadError] = useState(false);
  const skipInitialLoad = useRef(Boolean(initialResult));

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }

    let active = true;
    setResult(null);
    setLoadError(false);
    orpc.novels.list
      .call(input)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [input]);

  const items = result?.items ?? [];
  // These controls describe the catalog, not the already-filtered response.
  const genres = Object.keys(novelCategories);
  const tags = Object.keys(novelTagCounts);
  const visibleItems = items.slice(0, visibleCount);

  const updateSearch = (next: Partial<NovelSearch>) => {
    setVisibleCount(PAGE_SIZE);
    onSearchChange({ ...search, ...next });
  };
  const clearSearch = () => {
    setDraftQuery("");
    setVisibleCount(PAGE_SIZE);
    onSearchChange({});
  };

  const filters = (
    <ListingFacetRail
      category={
        fixedCategory
          ? undefined
          : {
              allLabel: "All",
              label: "Genre",
              onValueChange: (category) => updateSearch({ category }),
              options: genres.map((genre) => ({
                icon: <BookOpenIcon className="size-4" />,
                label: novelCategories[genre as keyof typeof novelCategories] ?? genre,
                value: genre,
              })),
              value: search.category,
            }
      }
      selectFacets={[
        {
          allLabel: "Audience: All",
          icon: <UsersIcon className="size-4" />,
          key: "audience",
          label: "Audience",
          onValueChange: (audience) =>
            updateSearch({ audience: audience as NovelSearch["audience"] }),
          options: [
            { label: "Male audience", value: "for-male" },
            { label: "Female audience", value: "for-female" },
            { label: "LGBT audience", value: "for-lgbt" },
          ],
          value: search.audience,
        },
        {
          allLabel: "Status: All",
          icon: <CalendarIcon className="size-4" />,
          key: "status",
          label: "Status",
          onValueChange: (status) => updateSearch({ status: status as NovelSearch["status"] }),
          options: [
            { label: "Ongoing", value: "ongoing" },
            { label: "Completed", value: "completed" },
            { label: "Hiatus", value: "hiatus" },
          ],
          value: search.status,
        },
        {
          allLabel: "Length: All",
          icon: <FileTextIcon className="size-4" />,
          key: "words",
          label: "Length",
          onValueChange: (words) => updateSearch({ words: words as NovelSearch["words"] }),
          options: [
            { label: "Under 300k words", value: "lt300k" },
            { label: "300k to 1m words", value: "300k-1m" },
            { label: "Over 1m words", value: "gt1m" },
          ],
          value: search.words,
        },
      ]}
      tags={
        fixedTag
          ? undefined
          : {
              label: "Tags",
              onToggle: (tag) => updateSearch({ tag: search.tag === tag ? undefined : tag }),
              options: tags.map((tag) => ({ label: tag.replaceAll("-", " "), value: tag })),
              selectedValues: search.tag ? [search.tag] : [],
            }
      }
      onClear={clearSearch}
    />
  );

  return (
    <ListingFrame
      className="py-12"
      filterLabel="Story filters"
      filters={filters}
      header={
        <div className="border-b border-slate-200 pb-6">
          <p className="text-xs font-bold tracking-[.18em] text-sky-600">AINOVEL LIBRARY</p>
          <h1 className="mt-2 font-serif text-4xl text-slate-900">{heading}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      }
      toolbar={
        <ListingToolbar
          search={
            <ListingSearchInput
              label="Search AI stories"
              onQueryChange={setDraftQuery}
              onSubmit={(q) => updateSearch({ q: q || undefined })}
              placeholder="Search titles, summaries, or tags"
              query={draftQuery}
              submitLabel="Search stories"
            />
          }
          sort={
            <ListingSortSelect
              onValueChange={(sort) => updateSearch({ sort: sort as NovelSearch["sort"] })}
              options={[
                { label: "Latest", value: "latest" },
                { label: "Most popular", value: "popular" },
                { label: "Recently updated", value: "updated" },
                { label: "Most chapters", value: "chapters" },
              ]}
              value={search.sort ?? "latest"}
            />
          }
          summary={<span>{result ? `${result.total} stories` : "Loading stories"}</span>}
        />
      }
    >
      {!result && !loadError ? <p className="text-sm text-slate-500">Loading stories...</p> : null}
      {loadError ? (
        <p className="text-sm text-red-700">Could not load the public novel library.</p>
      ) : null}
      {result && !loadError && visibleItems.length === 0 ? (
        <ListingEmptyState
          description="Try removing a filter or searching for a different story."
          title="No stories found"
        />
      ) : null}
      {visibleItems.length > 0 ? (
        <>
          <ListingGrid
            ariaLabel="AI stories"
            columns={3}
            getItemKey={(item) => item.slug}
            items={visibleItems}
            renderItem={(item) => <NovelCard item={item} />}
          />
          <ListingLoadMore
            hasMore={visibleCount < items.length}
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          />
        </>
      ) : null}
    </ListingFrame>
  );
}
function NovelCard({ item }: { item: NovelListItem }) {
  const displayTags = item.tags.filter((tag) => !tag.startsWith("for-")).slice(0, 3);

  return (
    <Link
      to="/novels/$slug"
      params={{ slug: item.slug }}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
        {item.coverUrl ? (
          <img
            alt={`${item.title} cover`}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            src={item.coverUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-400">
            <BookOpenIcon className="size-8" aria-hidden="true" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
          {novelCategories[item.genre as keyof typeof novelCategories] ?? item.genre}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="line-clamp-2 font-serif text-xl leading-6 text-slate-900">{item.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">{item.summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500"
            >
              {tag.replaceAll("-", " ")}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FileTextIcon className="size-3.5" aria-hidden="true" />
            {item.totalChapters} ch.
          </span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-3.5" aria-hidden="true" />
            {item.viewsCount.toLocaleString()}
          </span>
          <span
            className={cn("ml-auto capitalize", item.status === "ongoing" && "text-emerald-600")}
          >
            {item.status}
          </span>
        </div>
      </div>
    </Link>
  );
}
