import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { StaticPage } from "@/modules/novels/static-page";
import { staticPages, type StaticPageSlug } from "@/modules/novels/static-content";
import { StaticHelp } from "@/modules/novels/static-help";
import { NotFound404 } from "@/components/feedback/404/not-found-404";
import { buildSeoHead } from "@/utils/seo";

const staticSlugs = new Set([...Object.keys(staticPages), "help"]);

export const Route = createFileRoute("/$page")({
  params: { parse: (params) => ({ page: z.string().min(1).max(80).parse(params.page) }) },
  loader: ({ params }) => {
    if (!staticSlugs.has(params.page)) throw notFound();
    return params.page;
  },
  head: ({ params }) => {
    if (params.page === "help")
      return buildSeoHead({
        canonicalPath: "/help",
        description: "Get help with the public AINovel reader experience.",
        title: "Help Center | AINovel",
      });
    const content = staticPages[params.page as StaticPageSlug];
    return buildSeoHead({
      canonicalPath: `/${params.page}`,
      description: content?.description,
      title: `${content?.title ?? "AINovel"} | AINovel`,
    });
  },
  notFoundComponent: () => <NotFound404 />,
  component: StaticPageRoute,
});

function StaticPageRoute() {
  const page = Route.useLoaderData() ?? "";
  return (
    <NovelPublicShell>
      {page === "help" ? (
        <StaticHelp />
      ) : (
        <StaticPage content={staticPages[page as StaticPageSlug]} />
      )}
    </NovelPublicShell>
  );
}
