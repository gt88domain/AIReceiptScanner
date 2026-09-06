"use client";

import { BookMarkedIcon, SlidersHorizontalIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ListingEmptyState } from "@/modules/discovery/listing/listing-empty-state";
import { ListingFacetRail } from "@/modules/discovery/listing/listing-facet-rail";
import { ListingFrame } from "@/modules/discovery/listing/listing-frame";
import { ListingGrid } from "@/modules/discovery/listing/listing-grid";
import { ListingSearchInput } from "@/modules/discovery/listing/listing-search-input";
import { ListingSortSelect } from "@/modules/discovery/listing/listing-sort-select";
import { ListingToolbar } from "@/modules/discovery/listing/listing-toolbar";
import { useOrpc } from "@/hooks/use-orpc";
import type { getPublicWorldList } from "./world-loader";

const WORLD_TAGS = [
  "fantasy",
  "academy",
  "cultivation",
  "time-loop",
  "urban",
  "mystery",
  "romance",
  "sci-fi",
  "horror",
  "revenge",
] as const;

export type WorldSearch = {
  audience?: "male" | "female" | "lgbt" | "general";
  complexity?: "starter" | "balanced" | "advanced" | "expert";
  facet?: "theme" | "character" | "plot" | "rule-system";
  q?: string;
  sort?: "popular" | "latest" | "forks" | "novels";
  status?: "active" | "mature" | "archived";
  tag?: string;
};

export const worldSearchSchema = z.object({
  audience: z.enum(["male", "female", "lgbt", "general"]).optional(),
  complexity: z.enum(["starter", "balanced", "advanced", "expert"]).optional(),
  facet: z.enum(["theme", "character", "plot", "rule-system"]).optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(["popular", "latest", "forks", "novels"]).optional(),
  status: z.enum(["active", "mature", "archived"]).optional(),
  tag: z.string().max(80).optional(),
});

type WorldLibraryProps = {
  initialResult: Awaited<ReturnType<typeof getPublicWorldList>>;
  onSearchChange: (next: WorldSearch) => void;
  search: WorldSearch;
};

export function WorldLibrary({ initialResult, onSearchChange, search }: WorldLibraryProps) {
  const orpc = useOrpc();
  const [draftQuery, setDraftQuery] = useState(search.q ?? "");
  const [result, setResult] = useState(initialResult);
  const [failed, setFailed] = useState(false);
  const skipInitialLoad = useRef(true);
  const input = useMemo(() => ({ ...search, limit: 24, sort: search.sort ?? "popular" }), [search]);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    let active = true;
    setFailed(false);
    orpc.worlds.list
      .call(input)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [input]);

  const update = (next: Partial<WorldSearch>) => onSearchChange({ ...search, ...next });
  const clear = () => {
    setDraftQuery("");
    onSearchChange({});
  };
  const filters = (
    <ListingFacetRail
      selectFacets={[
        {
          key: "audience",
          label: "Audience",
          allLabel: "Audience: All",
          icon: <BookMarkedIcon className="size-4" />,
          value: search.audience,
          onValueChange: (audience) => update({ audience: audience as WorldSearch["audience"] }),
          options: [
            { label: "For Male", value: "male" },
            { label: "For Female", value: "female" },
            { label: "For LGBT", value: "lgbt" },
            { label: "General", value: "general" },
          ],
        },
        {
          key: "facet",
          label: "Facet",
          allLabel: "Facet: All",
          icon: <SlidersHorizontalIcon className="size-4" />,
          value: search.facet,
          onValueChange: (facet) => update({ facet: facet as WorldSearch["facet"] }),
          options: [
            { label: "Theme", value: "theme" },
            { label: "Character", value: "character" },
            { label: "Plot", value: "plot" },
            { label: "Rule System", value: "rule-system" },
          ],
        },
        {
          key: "status",
          label: "Status",
          allLabel: "Status: All",
          icon: <SparklesIcon className="size-4" />,
          value: search.status,
          onValueChange: (status) => update({ status: status as WorldSearch["status"] }),
          options: [
            { label: "Active", value: "active" },
            { label: "Mature", value: "mature" },
            { label: "Archived", value: "archived" },
          ],
        },
        {
          key: "complexity",
          label: "Complexity",
          allLabel: "Complexity: All",
          icon: <SlidersHorizontalIcon className="size-4" />,
          value: search.complexity,
          onValueChange: (complexity) =>
            update({ complexity: complexity as WorldSearch["complexity"] }),
          options: [
            { label: "Starter", value: "starter" },
            { label: "Balanced", value: "balanced" },
            { label: "Advanced", value: "advanced" },
            { label: "Expert", value: "expert" },
          ],
        },
      ]}
      tags={{
        label: "World tags",
        selectedValues: search.tag ? [search.tag] : [],
        onToggle: (tag) => update({ tag: search.tag === tag ? undefined : tag }),
        options: WORLD_TAGS.map((tag) => ({ label: tag.replaceAll("-", " "), value: tag })),
      }}
      onClear={clear}
    />
  );

  return (
    <ListingFrame
      className="py-8"
      filterLabel="World filters"
      filters={filters}
      header={<WorldHero />}
      toolbar={
        <ListingToolbar
          className="border-slate-200"
          search={
            <ListingSearchInput
              query={draftQuery}
              onQueryChange={setDraftQuery}
              onSubmit={(query) => update({ q: query || undefined })}
              placeholder="Search worlds"
            />
          }
          summary={<span>{result.total} templates</span>}
          sort={
            <ListingSortSelect
              value={search.sort ?? "popular"}
              onValueChange={(sort) => update({ sort: sort as WorldSearch["sort"] })}
              options={[
                { label: "Popular", value: "popular" },
                { label: "Latest", value: "latest" },
                { label: "Most forks", value: "forks" },
                { label: "Most novels", value: "novels" },
              ]}
            />
          }
        />
      }
    >
      {failed ? (
        <ListingEmptyState
          title="Could not load world templates"
          description="Try again later or clear the filters."
        />
      ) : result.items.length === 0 ? (
        <ListingEmptyState
          title="No worlds found"
          description="Try removing a filter or searching for another world."
        />
      ) : (
        <ListingGrid
          columns={3}
          items={result.items}
          getItemKey={(world) => world.slug}
          renderItem={(world) => <WorldCard world={world} />}
        />
      )}
    </ListingFrame>
  );
}

function WorldHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white px-6 py-12 sm:px-9 sm:py-16">
      <img
        src="/images/ainovel/generated/hero-main-1920x1080.webp"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-right opacity-75"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/90 to-white/10" />
      <p className="text-xs font-bold tracking-[0.2em] text-sky-600">NOVEL TEMPLATES</p>
      <h1 className="mt-3 max-w-2xl font-serif text-4xl text-slate-900 sm:text-6xl">
        Explore Novel Templates
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
        Explore planning systems, worldbuilding kits, and plot scaffolds while the standalone
        creator workspace is being prepared.
      </p>
    </section>
  );
}

function WorldCard({
  world,
}: {
  world: Awaited<ReturnType<typeof getPublicWorldList>>["items"][number];
}) {
  return (
    <article className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium capitalize text-sky-700">
          {world.genre ?? "world"}
        </span>
        <span className="text-xs text-slate-500">{world.novelsCount} novels</span>
      </div>
      <h2 className="mt-4 font-serif text-2xl text-slate-900">{world.title}</h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{world.description}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {world.worldTags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs capitalize text-slate-500"
          >
            {tag.replaceAll("-", " ")}
          </span>
        ))}
      </div>
    </article>
  );
}
