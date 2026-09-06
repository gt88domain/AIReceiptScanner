import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { NovelLibrary, novelSearchSchema } from "@/modules/novels/novel-library";
import { getPublicNovelList } from "@/modules/novels/list-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { novelCategories, novelCategoryAliases } from "@/modules/novels/taxonomy";
import { buildSeoHead, hasSearchParams } from "@/utils/seo";

export const Route = createFileRoute("/categories/$slug")({
  beforeLoad: ({ params }) => {
    const slug = params.slug.toLowerCase();
    const canonical = novelCategoryAliases[slug];
    if (canonical)
      throw redirect({ statusCode: 301, to: "/categories/$slug", params: { slug: canonical } });
    if (!(slug in novelCategories)) throw notFound();
  },
  validateSearch: novelSearchSchema,
  loaderDeps: ({ search }) => ({
    audience: search.audience,
    q: search.q,
    sort: search.sort,
    status: search.status,
    tag: search.tag,
    words: search.words,
  }),
  loader: ({ deps, params }) =>
    getPublicNovelList({
      data: { ...deps, category: params.slug, limit: 48, sort: deps.sort ?? "latest" },
    }),
  head: ({ loaderData, params }) => {
    const slug = params.slug as keyof typeof novelCategories;
    const title = novelCategories[slug]
      ? `${novelCategories[slug]} AI Stories | AINovel`
      : "Category | AINovel";
    const queryVariant = hasSearchParams();
    return buildSeoHead({
      canonicalPath: `/categories/${params.slug}`,
      description: `Browse ${novelCategories[slug] ?? "AI"} stories by popularity and recent updates.`,
      ldJson: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${novelCategories[slug] ?? "AI"} AI stories`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: (loaderData?.items ?? []).map((novel, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: novel.title,
          })),
        },
      },
      robots: queryVariant ? "noindex,follow" : undefined,
      title,
    });
  },
  component: CategoryRoute,
});

function CategoryRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialResult = Route.useLoaderData();
  const label = novelCategories[slug as keyof typeof novelCategories];

  return (
    <NovelPublicShell>
      <NovelLibrary
        description={`Browse public ${label} stories on AINovel.`}
        fixedCategory={slug}
        heading={`${label} AI Stories`}
        initialResult={initialResult}
        search={search}
        onSearchChange={(next) =>
          navigate({ search: { ...next, category: undefined }, replace: true })
        }
      />
    </NovelPublicShell>
  );
}
