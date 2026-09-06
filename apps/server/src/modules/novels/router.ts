import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { novelChapter, novelForumThread, novelNovel, novelWorld } from "@/db/schema/novels";
import { publicProcedure } from "@/lib/orpc";

const SORT_VALUES = ["latest", "popular", "updated", "chapters"] as const;
const STATUS_VALUES = ["ongoing", "completed", "hiatus"] as const;
const AUDIENCE_VALUES = ["for-male", "for-female", "for-lgbt"] as const;
const WORDS_VALUES = ["lt300k", "300k-1m", "gt1m"] as const;

const listInputSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  audience: z.enum(AUDIENCE_VALUES).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  words: z.enum(WORDS_VALUES).optional(),
  sort: z.enum(SORT_VALUES).default("latest"),
  limit: z.number().int().min(1).max(48).default(48),
});

const novelOutputSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  seoNoindex: z.boolean(),
  coverUrl: z.string().nullable(),
  genre: z.string(),
  tags: z.array(z.string()),
  audience: z.string().nullable(),
  status: z.string(),
  totalChapters: z.number(),
  totalWords: z.number(),
  viewsCount: z.number(),
  publishedAt: z.date(),
  updatedAt: z.date(),
});

const listOutputSchema = z.object({
  items: z.array(novelOutputSchema),
  total: z.number().int().nonnegative(),
});

const bySlugInputSchema = z.object({ slug: z.string().trim().min(1).max(160) });
const chapterInputSchema = bySlugInputSchema.extend({
  number: z.number().int().positive().max(100_000),
});

const chapterSummaryOutputSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  wordCount: z.number().int().nonnegative(),
  publishedAt: z.date(),
  updatedAt: z.date(),
});

const chapterOutputSchema = chapterSummaryOutputSchema.extend({ contentHtml: z.string() });
const chapterSitemapOutputSchema = z.object({
  novelSlug: z.string(),
  number: z.number().int().positive(),
  updatedAt: z.date(),
});

const WORLD_SORT_VALUES = ["popular", "latest", "forks", "novels"] as const;
const WORLD_AUDIENCE_VALUES = ["male", "female", "lgbt", "general"] as const;
const WORLD_STATUS_VALUES = ["active", "mature", "archived"] as const;
const WORLD_COMPLEXITY_VALUES = ["starter", "balanced", "advanced", "expert"] as const;
const WORLD_FACET_VALUES = ["theme", "character", "plot", "rule-system"] as const;
const worldProfileSchema = z.object({
  structural: z.record(z.string(), z.string()).optional(),
  meta: z.record(z.string(), z.string()).optional(),
});
const worldOutputSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  genre: z.string().nullable(),
  tags: z.array(z.string()),
  worldTags: z.array(z.string()),
  worldProfile: worldProfileSchema,
  forksCount: z.number().int().nonnegative(),
  novelsCount: z.number().int().nonnegative(),
  status: z.string(),
  complexity: z.string(),
  createdAt: z.date(),
});
const worldListInputSchema = z.object({
  q: z.string().trim().max(120).optional(),
  audience: z.enum(WORLD_AUDIENCE_VALUES).optional(),
  facet: z.enum(WORLD_FACET_VALUES).optional(),
  tag: z.string().trim().max(80).optional(),
  status: z.enum(WORLD_STATUS_VALUES).optional(),
  complexity: z.enum(WORLD_COMPLEXITY_VALUES).optional(),
  sort: z.enum(WORLD_SORT_VALUES).default("popular"),
  limit: z.number().int().min(1).max(48).default(24),
});

const forumListInputSchema = z.object({
  limit: z.number().int().min(1).max(24).default(12),
  section: z.string().trim().max(80).optional(),
});
const forumThreadOutputSchema = z.object({
  id: z.string(),
  slug: z.string(),
  sectionSlug: z.string(),
  authorName: z.string(),
  title: z.string(),
  excerpt: z.string(),
  replyCount: z.number().int().nonnegative(),
  createdAt: z.date(),
});

function worldAudienceCondition(value: z.infer<typeof worldListInputSchema>["audience"]) {
  return value
    ? sql`json_extract(${novelWorld.worldProfile}, '$.meta.audience') = ${value}`
    : undefined;
}

function wordCountCondition(value: z.infer<typeof listInputSchema>["words"]) {
  if (value === "lt300k") return sql`${novelNovel.totalWords} < 300000`;
  if (value === "300k-1m") {
    return sql`${novelNovel.totalWords} >= 300000 and ${novelNovel.totalWords} <= 1000000`;
  }
  if (value === "gt1m") return sql`${novelNovel.totalWords} > 1000000`;
  return undefined;
}

function optimizedCoverUrl(coverUrl: string | null) {
  return (
    coverUrl?.replace(
      /^\/images\/ainovel\/generated\/(novel-.+)\.png$/,
      "/images/ainovel/generated/$1.webp",
    ) ?? null
  );
}

/** Public D1 read model. No account/session data is read or returned. */
export const novelPublicRouter = {
  bySlug: publicProcedure
    .input(bySlugInputSchema)
    .output(novelOutputSchema.nullable())
    .handler(async ({ context, input }) => {
      const result = await context.db
        .select({
          slug: novelNovel.slug,
          title: novelNovel.title,
          summary: novelNovel.summary,
          seoTitle: novelNovel.seoTitle,
          seoDescription: novelNovel.seoDescription,
          seoNoindex: novelNovel.seoNoindex,
          coverUrl: novelNovel.coverUrl,
          genre: novelNovel.genre,
          tags: novelNovel.tags,
          audience: novelNovel.audience,
          status: novelNovel.status,
          totalChapters: novelNovel.totalChapters,
          totalWords: novelNovel.totalWords,
          viewsCount: novelNovel.viewsCount,
          publishedAt: novelNovel.publishedAt,
          updatedAt: novelNovel.updatedAt,
        })
        .from(novelNovel)
        .where(eq(novelNovel.slug, input.slug))
        .limit(1);

      const novel = result.at(0);
      return novel ? { ...novel, coverUrl: optimizedCoverUrl(novel.coverUrl) } : null;
    }),
  list: publicProcedure
    .input(listInputSchema)
    .output(listOutputSchema)
    .handler(async ({ context, input }) => {
      const conditions = [];

      if (input.category) conditions.push(eq(novelNovel.genre, input.category));
      if (input.tag) {
        conditions.push(
          sql`exists (select 1 from json_each(${novelNovel.tags}) where value = ${input.tag})`,
        );
      }
      if (input.audience) conditions.push(eq(novelNovel.audience, input.audience));
      if (input.status) conditions.push(eq(novelNovel.status, input.status));

      const wordsCondition = wordCountCondition(input.words);
      if (wordsCondition) conditions.push(wordsCondition);

      if (input.q) {
        const query = `%${input.q.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`lower(${novelNovel.title})`, query),
            like(sql`lower(${novelNovel.summary})`, query),
            like(sql`lower(${novelNovel.tags})`, query),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        input.sort === "popular"
          ? [desc(novelNovel.viewsCount), desc(novelNovel.publishedAt)]
          : input.sort === "updated"
            ? [desc(novelNovel.updatedAt)]
            : input.sort === "chapters"
              ? [desc(novelNovel.totalChapters), desc(novelNovel.publishedAt)]
              : [desc(novelNovel.publishedAt), asc(novelNovel.title)];

      const [items, totalRows] = await Promise.all([
        context.db
          .select()
          .from(novelNovel)
          .where(where)
          .orderBy(...orderBy)
          .limit(input.limit),
        context.db
          .select({ total: sql<number>`count(*)` })
          .from(novelNovel)
          .where(where),
      ]);

      return {
        items: items.map((item) => ({ ...item, coverUrl: optimizedCoverUrl(item.coverUrl) })),
        total: totalRows.at(0)?.total ?? 0,
      };
    }),
  related: publicProcedure
    .input(bySlugInputSchema)
    .output(z.object({ items: z.array(novelOutputSchema) }))
    .handler(async ({ context, input }) => {
      const current = await context.db
        .select({ genre: novelNovel.genre })
        .from(novelNovel)
        .where(eq(novelNovel.slug, input.slug))
        .limit(1);
      const genre = current.at(0)?.genre;
      if (!genre) return { items: [] };

      return {
        items: await context.db
          .select()
          .from(novelNovel)
          .where(and(eq(novelNovel.genre, genre), ne(novelNovel.slug, input.slug)))
          .orderBy(desc(novelNovel.viewsCount), desc(novelNovel.publishedAt))
          .limit(3),
      };
    }),
  chapters: {
    byNumber: publicProcedure
      .input(chapterInputSchema)
      .output(chapterOutputSchema.nullable())
      .handler(async ({ context, input }) => {
        const result = await context.db
          .select({
            number: novelChapter.chapterNumber,
            title: novelChapter.title,
            contentHtml: novelChapter.contentHtml,
            wordCount: novelChapter.wordCount,
            publishedAt: novelChapter.publishedAt,
            updatedAt: novelChapter.updatedAt,
          })
          .from(novelChapter)
          .where(
            and(
              eq(novelChapter.novelSlug, input.slug),
              eq(novelChapter.chapterNumber, input.number),
            ),
          )
          .limit(1);

        return result.at(0) ?? null;
      }),
    list: publicProcedure
      .input(bySlugInputSchema)
      .output(
        z.object({
          items: z.array(chapterSummaryOutputSchema),
          total: z.number().int().nonnegative(),
        }),
      )
      .handler(async ({ context, input }) => {
        const where = eq(novelChapter.novelSlug, input.slug);
        const [items, totalRows] = await Promise.all([
          context.db
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
            .limit(500),
          context.db
            .select({ total: sql<number>`count(*)` })
            .from(novelChapter)
            .where(where),
        ]);

        return { items, total: totalRows.at(0)?.total ?? 0 };
      }),
    sitemap: publicProcedure
      .output(z.object({ items: z.array(chapterSitemapOutputSchema) }))
      .handler(async ({ context }) => ({
        // ponytail: public chapter URLs remain capped at 500 until a cursor-backed
        // sitemap index is needed for a materially larger imported catalog.
        items: await context.db
          .select({
            novelSlug: novelChapter.novelSlug,
            number: novelChapter.chapterNumber,
            updatedAt: novelChapter.updatedAt,
          })
          .from(novelChapter)
          .orderBy(desc(novelChapter.updatedAt))
          .limit(500),
      })),
  },
};
/** A separate world router keeps the public read model independent from accounts and authoring. */
export const novelWorldRouter = {
  bySlug: publicProcedure
    .input(bySlugInputSchema)
    .output(worldOutputSchema.nullable())
    .handler(async ({ context, input }) => {
      const result = await context.db
        .select()
        .from(novelWorld)
        .where(eq(novelWorld.slug, input.slug))
        .limit(1);
      return result.at(0) ?? null;
    }),
  list: publicProcedure
    .input(worldListInputSchema)
    .output(z.object({ items: z.array(worldOutputSchema), total: z.number().int().nonnegative() }))
    .handler(async ({ context, input }) => {
      const conditions = [];
      if (input.tag) {
        conditions.push(
          sql`exists (select 1 from json_each(${novelWorld.worldTags}) where value = ${input.tag})`,
        );
      }
      if (input.status) conditions.push(eq(novelWorld.status, input.status));
      if (input.complexity) conditions.push(eq(novelWorld.complexity, input.complexity));
      const audience = worldAudienceCondition(input.audience);
      if (audience) conditions.push(audience);
      if (input.facet) {
        // The legacy API models these as profile dimensions, not separate records.
        const profileKey = input.facet === "rule-system" ? "powerSystem" : input.facet;
        conditions.push(
          sql`json_type(${novelWorld.worldProfile}, ${`$.structural.${profileKey}`}) is not null`,
        );
      }
      if (input.q) {
        const query = `%${input.q.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`lower(${novelWorld.title})`, query),
            like(sql`lower(coalesce(${novelWorld.description}, ''))`, query),
            like(sql`lower(${novelWorld.tags})`, query),
            like(sql`lower(${novelWorld.worldTags})`, query),
          ),
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        input.sort === "latest"
          ? [desc(novelWorld.createdAt)]
          : input.sort === "forks"
            ? [desc(novelWorld.forksCount), desc(novelWorld.createdAt)]
            : [desc(novelWorld.novelsCount), desc(novelWorld.createdAt)];
      const [items, totalRows] = await Promise.all([
        context.db
          .select()
          .from(novelWorld)
          .where(where)
          .orderBy(...orderBy)
          .limit(input.limit),
        context.db
          .select({ total: sql<number>`count(*)` })
          .from(novelWorld)
          .where(where),
      ]);
      return { items, total: totalRows.at(0)?.total ?? 0 };
    }),
};

/** Deliberately read-only: only reviewed main posts are present in the public projection. */
export const novelForumRouter = {
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(240) }))
    .output(forumThreadOutputSchema.nullable())
    .handler(async ({ context, input }) => {
      const result = await context.db
        .select()
        .from(novelForumThread)
        .where(eq(novelForumThread.slug, input.slug))
        .limit(1);
      return result.at(0) ?? null;
    }),
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(forumThreadOutputSchema.nullable())
    .handler(async ({ context, input }) => {
      const result = await context.db
        .select()
        .from(novelForumThread)
        .where(eq(novelForumThread.id, input.id))
        .limit(1);
      return result.at(0) ?? null;
    }),
  list: publicProcedure
    .input(forumListInputSchema)
    .output(
      z.object({ items: z.array(forumThreadOutputSchema), total: z.number().int().nonnegative() }),
    )
    .handler(async ({ context, input }) => {
      const where = input.section ? eq(novelForumThread.sectionSlug, input.section) : undefined;
      const [items, totalRows] = await Promise.all([
        context.db
          .select()
          .from(novelForumThread)
          .where(where)
          .orderBy(desc(novelForumThread.createdAt))
          .limit(input.limit),
        context.db
          .select({ total: sql<number>`count(*)` })
          .from(novelForumThread)
          .where(where),
      ]);

      return { items, total: totalRows.at(0)?.total ?? 0 };
    }),
};
