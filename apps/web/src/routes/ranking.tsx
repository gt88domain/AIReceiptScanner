import { Link, createFileRoute } from "@tanstack/react-router";
import { EyeIcon, FileTextIcon } from "lucide-react";
import { z } from "zod";
import { getPublicNovelRanking } from "@/modules/novels/ranking-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { buildSeoHead, hasSearchParams } from "@/utils/seo";

const rankingSearchSchema = z.object({
  period: z.enum(["weekly", "monthly", "all"]).catch("all").optional(),
});

export const Route = createFileRoute("/ranking")({
  validateSearch: rankingSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPublicNovelRanking({ data: { period: deps.period ?? "all" } }),
  head: ({ loaderData }) =>
    buildSeoHead({
      canonicalPath: "/ranking",
      description: "Track the most-read public AI stories on AINovel.",
      robots: hasSearchParams() ? "noindex,follow" : undefined,
      title: "Best AI Novels Ranking | AINovel",
      ldJson: {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "AINovel public story ranking",
        itemListElement: (loaderData?.items ?? []).map((novel, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: novel.title,
        })),
      },
    }),
  component: RankingRoute,
});

function compact(value: number): string {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);
}

function RankingRoute() {
  const { items } = Route.useLoaderData();
  const { period = "all" } = Route.useSearch() ?? {};
  return (
    <NovelPublicShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold tracking-[.18em] text-sky-600">AINOVEL RANKING</p>
          <h1 className="mt-2 font-serif text-5xl text-slate-900">Rankings</h1>
          <p className="mt-3 text-slate-600">Top novels by public views</p>
        </header>
        <nav
          aria-label="Ranking period"
          className="mt-7 inline-flex rounded-xl border border-slate-200 bg-white p-1"
        >
          {(["weekly", "monthly", "all"] as const).map((value) => (
            <Link
              key={value}
              to="/ranking"
              search={{ period: value }}
              className={`min-h-9 rounded-lg px-3 text-sm capitalize ${period === value ? "bg-sky-600 text-white" : "text-slate-600 hover:text-sky-700"}`}
            >
              {value === "all" ? "All time" : value}
            </Link>
          ))}
        </nav>
        {period !== "all" ? (
          <p className="mt-4 text-sm text-slate-500">
            Period snapshots are not imported; this view uses the same public all-time data.
          </p>
        ) : null}
        <ol className="mt-8 space-y-3">
          {items.map((novel, index) => (
            <li key={novel.slug}>
              <Link
                to="/novels/$slug"
                params={{ slug: novel.slug }}
                className="grid min-h-24 grid-cols-[2.25rem_3.25rem_minmax(0,1fr)] items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-sky-300 sm:grid-cols-[2.75rem_3.5rem_minmax(0,1fr)_auto]"
              >
                <span
                  className={`text-center font-serif text-2xl ${index < 3 ? "text-sky-600" : "text-slate-400"}`}
                >
                  {index + 1}
                </span>
                {novel.coverUrl ? (
                  <img
                    className="aspect-[2/3] w-12 rounded object-cover"
                    src={novel.coverUrl}
                    alt=""
                  />
                ) : (
                  <div className="aspect-[2/3] w-12 rounded bg-slate-100" />
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-xl text-slate-900">{novel.title}</h2>
                  <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-xs capitalize text-sky-700">
                    {novel.genre.replaceAll("-", " ")}
                  </span>
                </div>
                <div className="col-span-3 flex gap-5 border-t border-slate-100 pt-3 text-sm text-slate-500 sm:col-span-1 sm:border-0 sm:pt-0">
                  <span className="inline-flex items-center gap-1">
                    <FileTextIcon className="size-4" />
                    {novel.totalChapters} ch
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <EyeIcon className="size-4" />
                    {compact(novel.viewsCount)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </NovelPublicShell>
  );
}
