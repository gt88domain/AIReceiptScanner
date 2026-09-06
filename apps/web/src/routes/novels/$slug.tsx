import { Outlet, createFileRoute, notFound, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import { NovelDetail } from "@/modules/novels/novel-detail";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import {
  getPublicNovelBySlug,
  getPublicNovelChapters,
  getPublicRelatedNovels,
} from "@/modules/novels/detail-loader";
import { NotFound404 } from "@/components/feedback/404/not-found-404";
import { buildNoIndexHead, buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/novels/$slug")({
  params: { parse: (params) => ({ slug: z.string().min(1).max(160).parse(params.slug) }) },
  loader: async ({ params }) => {
    const novel = await getPublicNovelBySlug({ data: { slug: params.slug } });
    if (!novel) throw notFound();
    const [chapters, related] = await Promise.all([
      getPublicNovelChapters({ data: { slug: novel.slug } }),
      getPublicRelatedNovels({ data: { slug: novel.slug } }),
    ]);
    return { novel, chapters: chapters.items, related: related.items };
  },
  head: ({ loaderData, matches, params }) => {
    const novel = loaderData?.novel;
    if (!novel) {
      return buildNoIndexHead({ canonicalPath: "/404", title: "Page Not Found | AINovel" });
    }
    // A nested chapter owns its canonical and structured data. TanStack emits
    // every matched route's head assets, so the parent must stay silent here.
    if (matches.some((match) => match.routeId.endsWith("/chapter/$number"))) {
      return {};
    }
    return buildSeoHead({
      canonicalPath: `/novels/${params.slug}`,
      description: novel?.seoDescription ?? novel?.summary,
      image: novel?.coverUrl ?? undefined,
      imageAlt: novel?.title ? `${novel.title} cover` : undefined,
      ldJson: novel
        ? {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Book",
                name: novel.title,
                description: novel.summary,
                image: novel.coverUrl ?? undefined,
                genre: novel.genre,
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Stories" },
                  { "@type": "ListItem", position: 2, name: novel.title },
                ],
              },
            ],
          }
        : undefined,
      robots: novel?.seoNoindex ? "noindex,follow" : undefined,
      title: novel?.seoTitle ?? (novel?.title ? `${novel.title} | AINovel` : "AI Story | AINovel"),
    });
  },
  notFoundComponent: () => <NotFound404 />,
  component: NovelDetailRoute,
});

function NovelDetailRoute() {
  const { pathname } = useLocation();
  const { novel, chapters, related } = Route.useLoaderData();

  if (pathname.startsWith(`/novels/${novel.slug}/chapter/`)) {
    return <Outlet />;
  }

  return (
    <NovelPublicShell>
      <NovelDetail novel={novel} chapters={chapters} related={related} />
    </NovelPublicShell>
  );
}
