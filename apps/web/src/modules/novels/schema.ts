import { toAbsoluteUrl } from "@repo/shared";
import type { JsonLdObject } from "@/utils/seo";

type NovelSchemaData = {
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  genre: string;
  tags: string[];
  totalChapters: number;
  totalWords: number;
  publishedAt: Date;
  updatedAt: Date;
};

type ChapterSchemaData = {
  number: number;
  title: string;
  wordCount: number;
  contentHtml?: string;
  publishedAt: Date;
  updatedAt: Date;
};

/**
 * Legacy chapter imports leave `title` empty or copy the book title in.
 * Both cases must render as "Chapter {n}" so chapter pages stop sharing
 * one duplicated Title/H1/headline across the whole catalog.
 */
export function resolveChapterHeadline(
  chapter: Pick<ChapterSchemaData, "number" | "title">,
  novel: Pick<NovelSchemaData, "title">,
): string {
  const title = chapter.title.trim();
  if (!title || title === novel.title.trim()) {
    return `Chapter ${chapter.number}`;
  }
  return title;
}

/** Meta description from the chapter body text (first ~155 chars), never a book-title echo. */
export function buildChapterMetaDescription(chapter: ChapterSchemaData): string {
  const text = (chapter.contentHtml ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return `Read Chapter ${chapter.number} of this AI story on AINovel.`;
  }
  return text.length > 158 ? `${text.slice(0, 155)}...` : text;
}

/** Book + BreadcrumbList for a novel detail page. All URLs are absolute. */
export function buildNovelDetailJsonLd(
  origin: string,
  novel: NovelSchemaData,
): JsonLdObject {
  const bookUrl = toAbsoluteUrl(`/novels/${novel.slug}`, origin);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Book",
        name: novel.title,
        url: bookUrl,
        description: novel.summary,
        ...(novel.coverUrl ? { image: toAbsoluteUrl(novel.coverUrl, origin) } : {}),
        genre: [novel.genre, ...novel.tags],
        inLanguage: "en",
        bookFormat: "https://schema.org/EBook",
        datePublished: novel.publishedAt.toISOString().slice(0, 10),
        dateModified: novel.updatedAt.toISOString().slice(0, 10),
        wordCount: novel.totalWords,
        publisher: {
          "@type": "Organization",
          name: "AINovel",
          url: toAbsoluteUrl("/", origin),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: toAbsoluteUrl("/", origin),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Stories",
            item: toAbsoluteUrl("/novels", origin),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: novel.title,
            item: bookUrl,
          },
        ],
      },
    ],
  };
}

/** Article node for a chapter page, keyed to its parent Book. */
export function buildNovelChapterJsonLd(
  origin: string,
  novel: Pick<NovelSchemaData, "slug" | "title">,
  chapter: ChapterSchemaData,
): JsonLdObject {
  const chapterUrl = toAbsoluteUrl(
    `/novels/${novel.slug}/chapter/${chapter.number}`,
    origin,
  );
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${resolveChapterHeadline(chapter, novel)} - ${novel.title}`,
    url: chapterUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": chapterUrl },
    datePublished: chapter.publishedAt.toISOString(),
    dateModified: chapter.updatedAt.toISOString(),
    inLanguage: "en",
    wordCount: chapter.wordCount,
    isPartOf: {
      "@type": "Book",
      name: novel.title,
      url: toAbsoluteUrl(`/novels/${novel.slug}`, origin),
    },
    publisher: {
      "@type": "Organization",
      name: "AINovel",
      url: toAbsoluteUrl("/", origin),
    },
  };
}
