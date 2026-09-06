import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import {
  getPublicNovelBySlug,
  getPublicNovelChapter,
  getPublicNovelChapters,
} from "@/modules/novels/detail-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { NotFound404 } from "@/components/feedback/404/not-found-404";
import { buildNoIndexHead, buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/novels/$slug/chapter/$number")({
  loader: async ({ params }) => {
    const slug = z
      .string()
      .min(1)
      .max(160)
      .parse((params as { slug?: unknown }).slug);
    const number = z.coerce.number().int().positive().max(100_000).parse(params.number);
    const [novel, chapter, chapters] = await Promise.all([
      getPublicNovelBySlug({ data: { slug } }),
      getPublicNovelChapter({ data: { slug, number } }),
      getPublicNovelChapters({ data: { slug } }),
    ]);
    if (!novel || !chapter) throw notFound();
    return { chapter, chapters: chapters.items, novel };
  },
  head: ({ loaderData }) => {
    const chapter = loaderData?.chapter;
    const novel = loaderData?.novel;
    if (!chapter || !novel) {
      return buildNoIndexHead({ canonicalPath: "/404", title: "Page Not Found | AINovel" });
    }
    return buildSeoHead({
      canonicalPath: `/novels/${novel.slug}/chapter/${chapter.number}`,
      description: chapter
        ? `Read ${chapter.title} from ${novel?.title ?? "AINovel"}.`
        : "Read an AI story chapter on AINovel.",
      ldJson:
        chapter && novel
          ? {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: chapter.title,
              isPartOf: { "@type": "Book", name: novel.title },
              wordCount: chapter.wordCount,
            }
          : undefined,
      robots: novel?.seoNoindex ? "noindex,follow" : undefined,
      title:
        chapter && novel
          ? `${chapter.title} | ${novel.title} | AINovel`
          : "Story chapter | AINovel",
    });
  },
  notFoundComponent: () => <NotFound404 />,
  component: NovelChapterRoute,
});

function NovelChapterRoute() {
  const { chapter, chapters, novel } = Route.useLoaderData();
  const currentIndex = chapters.findIndex((item) => item.number === chapter.number);
  const previous = chapters.at(currentIndex - 1);
  const next = chapters.at(currentIndex + 1);

  return (
    <NovelPublicShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <nav
          className="mb-8 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-500"
          aria-label="Breadcrumb"
        >
          <Link to="/novels" className="hover:text-sky-700">
            Stories
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/novels/$slug"
            params={{ slug: novel.slug }}
            className="truncate hover:text-sky-700"
          >
            {novel.title}
          </Link>
        </nav>
        <article>
          <header className="border-b border-slate-200 pb-6">
            <p className="text-xs font-bold tracking-[.18em] text-sky-600">
              CHAPTER {chapter.number}
            </p>
            <h1 className="mt-2 font-serif text-4xl text-slate-900">{chapter.title}</h1>
            <p className="mt-3 text-sm text-slate-500">
              {chapter.wordCount.toLocaleString()} words
            </p>
          </header>
          <div className="space-y-5 py-8 text-[1.05rem] leading-8 text-slate-700">
            {toParagraphs(chapter.contentHtml).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
        <nav
          className="grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2"
          aria-label="Chapter navigation"
        >
          {previous ? (
            <ChapterLink chapter={previous} direction="Previous" slug={novel.slug} />
          ) : (
            <span />
          )}
          {next ? <ChapterLink chapter={next} direction="Next" slug={novel.slug} alignEnd /> : null}
        </nav>
      </main>
    </NovelPublicShell>
  );
}

function ChapterLink({
  alignEnd = false,
  chapter,
  direction,
  slug,
}: {
  alignEnd?: boolean;
  chapter: { number: number; title: string };
  direction: string;
  slug: string;
}) {
  return (
    <Link
      to="/novels/$slug/chapter/$number"
      params={{ slug, number: String(chapter.number) }}
      className={`min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-sky-400 hover:text-sky-700 ${alignEnd ? "sm:text-right" : ""}`}
    >
      <span className="block text-xs text-slate-500">{direction}</span>
      <span className="block truncate font-medium">{chapter.title}</span>
    </Link>
  );
}

function toParagraphs(contentHtml: string): string[] {
  // Imported legacy HTML is deliberately rendered as text: it remains readable
  // without trusting historical markup in the public rendering boundary.
  return contentHtml
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map((paragraph) =>
      paragraph
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .trim(),
    )
    .filter(Boolean);
}
