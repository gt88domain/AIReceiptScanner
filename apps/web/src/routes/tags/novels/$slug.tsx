import { createFileRoute, notFound } from "@tanstack/react-router";
import { NovelLibrary, novelSearchSchema } from "@/modules/novels/novel-library";
import { getPublicNovelList } from "@/modules/novels/list-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { NOVEL_TAG_INDEX_THRESHOLD, novelTagCounts } from "@/modules/novels/taxonomy";
import { buildSeoHead, hasSearchParams } from "@/utils/seo";

export const Route = createFileRoute("/tags/novels/$slug")({
  beforeLoad: ({ params }) => {
    const slug = params.slug.toLowerCase();
    if (!(slug in novelTagCounts)) throw notFound();
  },
  validateSearch: novelSearchSchema,
  loaderDeps: ({ search }) => ({
    audience: search.audience,
    category: search.category,
    q: search.q,
    sort: search.sort,
    status: search.status,
    words: search.words,
  }),
  loader: ({ deps, params }) =>
    getPublicNovelList({
      data: { ...deps, limit: 48, sort: deps.sort ?? "latest", tag: params.slug },
    }),
  head: ({ loaderData, params }) => {
    const slug = params.slug as keyof typeof novelTagCounts;
    const indexable = novelTagCounts[slug] >= NOVEL_TAG_INDEX_THRESHOLD && !hasSearchParams();
    const label = params.slug.replaceAll("-", " ");
    return buildSeoHead({
      canonicalPath: `/tags/novels/${params.slug}`,
      description: `Browse AI stories tagged with ${label}.`,
      ldJson: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${label} AI stories`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: (loaderData?.items ?? []).map((novel, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: novel.title,
          })),
        },
      },
      robots: indexable ? undefined : "noindex,follow",
      title: `${label} AI Stories Tag | AINovel`,
    });
  },
  component: TagRoute,
});

function TagRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialResult = Route.useLoaderData();
  const label = slug.replaceAll("-", " ");

  return (
    <NovelPublicShell>
      <NovelLibrary
        description={`Browse public AI stories tagged with ${label}.`}
        fixedTag={slug}
        heading={`${label} AI Stories`}
        initialResult={initialResult}
        search={search}
        onSearchChange={(next) => navigate({ search: { ...next, tag: undefined }, replace: true })}
      />
    </NovelPublicShell>
  );
}
