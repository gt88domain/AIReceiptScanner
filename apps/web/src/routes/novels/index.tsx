import { createFileRoute } from "@tanstack/react-router";
import { NovelLibrary, novelSearchSchema } from "@/modules/novels/novel-library";
import { getPublicNovelList } from "@/modules/novels/list-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { buildSeoHead, hasSearchParams } from "@/utils/seo";

export const Route = createFileRoute("/novels/")({
  validateSearch: novelSearchSchema,
  loaderDeps: ({ search }) => ({
    audience: search.audience,
    category: search.category,
    q: search.q,
    sort: search.sort,
    status: search.status,
    tag: search.tag,
    words: search.words,
  }),
  loader: ({ deps }) =>
    getPublicNovelList({ data: { ...deps, limit: 48, sort: deps.sort ?? "latest" } }),
  head: ({ loaderData }) =>
    buildSeoHead({
      canonicalPath: "/novels",
      description: "Browse AI-generated stories by genre, popularity, and recent updates.",
      ldJson: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "AINovel AI stories library",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: (loaderData?.items ?? []).map((novel, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: novel.title,
          })),
        },
      },
      robots: hasSearchParams() ? "noindex,follow" : undefined,
      title: "AI Stories Library | AINovel",
    }),
  component: NovelsRoute,
});

function NovelsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialResult = Route.useLoaderData();

  return (
    <NovelPublicShell>
      <NovelLibrary
        initialResult={initialResult}
        search={search}
        onSearchChange={(next) => navigate({ search: next, replace: true })}
      />
    </NovelPublicShell>
  );
}
