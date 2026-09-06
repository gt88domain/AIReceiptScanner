import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Public-only novel projection. It deliberately has no foreign key to Better Auth users. */
export const novelNovel = sqliteTable(
  "novel_novels",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoNoindex: integer("seo_noindex", { mode: "boolean" }).notNull().default(false),
    coverUrl: text("cover_url"),
    genre: text("genre").notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    audience: text("audience"),
    status: text("status").notNull(),
    totalChapters: integer("total_chapters").notNull().default(0),
    totalWords: integer("total_words").notNull().default(0),
    viewsCount: integer("views_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("novel_novels_slug_idx").on(table.slug),
    index("novel_novels_genre_published_idx").on(table.genre, table.publishedAt),
    index("novel_novels_status_published_idx").on(table.status, table.publishedAt),
    index("novel_novels_views_idx").on(table.viewsCount),
  ],
);

/** Public chapter projection, keyed by the public novel slug rather than an account-owned record. */
export const novelChapter = sqliteTable(
  "novel_chapters",
  {
    id: text("id").primaryKey(),
    novelSlug: text("novel_slug").notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    title: text("title").notNull(),
    contentHtml: text("content_html").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("novel_chapters_novel_number_idx").on(table.novelSlug, table.chapterNumber),
    index("novel_chapters_novel_published_idx").on(table.novelSlug, table.publishedAt),
  ],
);

/** Public world/template projection imported from the legacy /worlds API. */
export const novelWorld = sqliteTable(
  "novel_worlds",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    genre: text("genre"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    worldTags: text("world_tags", { mode: "json" }).$type<string[]>().notNull(),
    worldProfile: text("world_profile", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    forksCount: integer("forks_count").notNull().default(0),
    novelsCount: integer("novels_count").notNull().default(0),
    status: text("status").notNull().default("active"),
    complexity: text("complexity").notNull().default("balanced"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("novel_worlds_slug_idx").on(table.slug),
    index("novel_worlds_popular_idx").on(table.novelsCount),
    index("novel_worlds_genre_idx").on(table.genre),
  ],
);

/** Moderated legacy forum main posts only; replies and account references are not imported. */
export const novelForumThread = sqliteTable(
  "novel_forum_threads",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    sectionSlug: text("section_slug").notNull(),
    authorName: text("author_name").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    replyCount: integer("reply_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("novel_forum_threads_slug_idx").on(table.slug),
    index("novel_forum_threads_created_idx").on(table.createdAt),
    index("novel_forum_threads_section_created_idx").on(table.sectionSlug, table.createdAt),
  ],
);

export type NovelNovel = typeof novelNovel.$inferSelect;
export type NovelChapter = typeof novelChapter.$inferSelect;
export type NovelWorld = typeof novelWorld.$inferSelect;
export type NovelForumThread = typeof novelForumThread.$inferSelect;
