import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { createDb } from "@/db";
import { novelChapter, novelNovel } from "@/db/schema/novels";
import type { PublicReadRouteRegistrar } from "@/app/register-public-read-routes";

const maxNovelLimit = 48;
const maxChapterLimit = 500;

function boundedLimit(rawValue: string | undefined, fallback: number, maximum: number) {
  const value = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), maximum) : fallback;
}

function absoluteCoverUrl(coverUrl: string | null, websiteUrl: string | undefined) {
  if (!coverUrl || !websiteUrl) return coverUrl;
  try {
    return new URL(coverUrl, websiteUrl).toString();
  } catch {
    return coverUrl;
  }
}

function mobileNovel(
  novel: typeof novelNovel.$inferSelect,
  websiteUrl: string | undefined,
) {
  return {
    id: novel.slug,
    slug: novel.slug,
    title: novel.title,
    description: novel.summary,
    coverImage: absoluteCoverUrl(novel.coverUrl, websiteUrl),
    author: { id: "ainovel", name: "AINovel" },
    chapterCount: novel.totalChapters,
    viewCount: novel.viewsCount,
    ratingAvg: 0,
    bookmarksCount: 0,
    publishedAt: novel.publishedAt.toISOString(),
    updatedAt: novel.updatedAt.toISOString(),
    genre: novel.genre,
    tags: novel.tags,
    audience: novel.audience,
    status: novel.status,
    totalWords: novel.totalWords,
  };
}

function chapterId(slug: string, number: number) {
  return `${slug}:${number}`;
}

/**
 * A small, stable JSON surface for the standalone Flutter reader.
 * It is deliberately public/read-only and returns no account or session data.
 */
export const registerNovelMobileReadRoutes: PublicReadRouteRegistrar = (app) => {
  app.get("/mobile/v1/novels", async (c) => {
    const db = createDb(c.env.DB);
    const limit = boundedLimit(c.req.query("limit"), 20, maxNovelLimit);
    const sort = c.req.query("sort") ?? "updated";
    const category = c.req.query("category")?.trim();
    const query = c.req.query("q")?.trim().toLowerCase();
    const conditions = [];

    if (category) conditions.push(eq(novelNovel.genre, category));
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          like(sql`lower(${novelNovel.title})`, pattern),
          like(sql`lower(${novelNovel.summary})`, pattern),
          like(sql`lower(${novelNovel.tags})`, pattern),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy =
      sort === "popular" || sort === "rating"
        ? [desc(novelNovel.viewsCount), desc(novelNovel.updatedAt)]
        : sort === "latest"
          ? [desc(novelNovel.publishedAt), asc(novelNovel.title)]
          : [desc(novelNovel.updatedAt), asc(novelNovel.title)];
    const [items, countRows] = await Promise.all([
      db.select().from(novelNovel).where(where).orderBy(...orderBy).limit(limit),
      db.select({ total: sql<number>`count(*)` }).from(novelNovel).where(where),
    ]);

    c.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return c.json({
      items: items.map((item) => mobileNovel(item, c.env.WEBSITE_URL)),
      total: countRows.at(0)?.total ?? 0,
    });
  });

  app.get("/mobile/v1/novels/:slug", async (c) => {
    const db = createDb(c.env.DB);
    const item = (
      await db
        .select()
        .from(novelNovel)
        .where(eq(novelNovel.slug, c.req.param("slug")))
        .limit(1)
    ).at(0);
    if (!item) return c.json({ error: "Novel not found" }, 404);

    c.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return c.json({ item: mobileNovel(item, c.env.WEBSITE_URL) });
  });

  app.get("/mobile/v1/novels/:slug/chapters", async (c) => {
    const db = createDb(c.env.DB);
    const slug = c.req.param("slug");
    const limit = boundedLimit(c.req.query("limit"), maxChapterLimit, maxChapterLimit);
    const where = eq(novelChapter.novelSlug, slug);
    const [items, countRows] = await Promise.all([
      db
        .select({
          number: novelChapter.chapterNumber,
          title: novelChapter.title,
          wordCount: novelChapter.wordCount,
          publishedAt: novelChapter.publishedAt,
          updatedAt: novelChapter.updatedAt,
        })
        .from(novelChapter)
        .where(where)
        .orderBy(asc(novelChapter.chapterNumber))
        .limit(limit),
      db.select({ total: sql<number>`count(*)` }).from(novelChapter).where(where),
    ]);

    c.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return c.json({
      items: items.map((item) => ({
        id: chapterId(slug, item.number),
        novelId: slug,
        chapterNumber: item.number,
        title: item.title,
        wordCount: item.wordCount,
        publishedAt: item.publishedAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total: countRows.at(0)?.total ?? 0,
    });
  });

  app.get("/mobile/v1/novels/:slug/chapters/:number", async (c) => {
    const number = Number.parseInt(c.req.param("number"), 10);
    if (!Number.isSafeInteger(number) || number < 1 || number > 100_000) {
      return c.json({ error: "Invalid chapter number" }, 400);
    }

    const db = createDb(c.env.DB);
    const slug = c.req.param("slug");
    const item = (
      await db
        .select({
          title: novelChapter.title,
          contentHtml: novelChapter.contentHtml,
          wordCount: novelChapter.wordCount,
          publishedAt: novelChapter.publishedAt,
          updatedAt: novelChapter.updatedAt,
        })
        .from(novelChapter)
        .where(
          and(eq(novelChapter.novelSlug, slug), eq(novelChapter.chapterNumber, number)),
        )
        .limit(1)
    ).at(0);
    if (!item) return c.json({ error: "Chapter not found" }, 404);

    c.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return c.json({
      item: {
        id: chapterId(slug, number),
        novelId: slug,
        chapterNumber: number,
        title: item.title,
        contentHtml: item.contentHtml,
        wordCount: item.wordCount,
        publishedAt: item.publishedAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  });

  app.get("/mobile/v1/meta", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await db
      .select({ genre: novelNovel.genre, tags: novelNovel.tags })
      .from(novelNovel)
      .limit(2_000);
    const genreCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const row of rows) {
      genreCounts.set(row.genre, (genreCounts.get(row.genre) ?? 0) + 1);
      for (const tag of row.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const descendingCount = ([, left]: [string, number], [, right]: [string, number]) =>
      right - left;

    c.header("Cache-Control", "public, max-age=300, s-maxage=1800");
    return c.json({
      genres: [...genreCounts.entries()]
        .sort(descendingCount)
        .map(([name, count]) => ({ name, slug: name, count })),
      topTags: [...tagCounts.entries()]
        .sort(descendingCount)
        .slice(0, 48)
        .map(([name, count]) => ({ name, slug: name, count })),
      tagsByGenre: [],
    });
  });

  return undefined;
};
