import { createFileRoute } from "@tanstack/react-router";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { WorldLibrary, worldSearchSchema } from "@/modules/novels/world-library";
import { getPublicWorldList } from "@/modules/novels/world-loader";
import { buildSeoHead, hasSearchParams } from "@/utils/seo";

export const Route = createFileRoute("/worlds/")({
  validateSearch: worldSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getPublicWorldList({ data: { ...deps, limit: 24, sort: deps.sort ?? "popular" } }),
  head: () =>
    buildSeoHead({
      title: "Explore Novel Templates | AINovel",
      description: "Explore public novel templates, worldbuilding kits, and story systems.",
      canonicalPath: "/worlds",
      robots: hasSearchParams() ? "noindex,follow" : undefined,
    }),
  component: WorldsRoute,
});

function WorldsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <NovelPublicShell>
      <WorldLibrary
        initialResult={Route.useLoaderData()}
        search={search}
        onSearchChange={(next) => navigate({ search: next, replace: true })}
      />
    </NovelPublicShell>
  );
}
