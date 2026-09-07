import { describe, expect, it } from "vitest";
import {
  buildChapterMetaDescription,
  buildNovelChapterJsonLd,
  buildNovelDetailJsonLd,
  resolveChapterHeadline,
} from "./schema";

const novel = {
  slug: "the-clairvoyant",
  title: "The Clairvoyant",
  summary: "A doctor wakes up with the ability to see the last minute of a patient's life.",
  coverUrl: "/images/ainovel/generated/novel-the-clairvoyant-832x1248-1.webp",
  genre: "Romance",
  tags: ["Doctor", "Survival"],
  totalChapters: 8,
  totalWords: 14940,
  publishedAt: new Date("2026-05-01T00:00:00Z"),
  updatedAt: new Date("2026-05-25T00:00:00Z"),
};

const chapter = {
  number: 3,
  title: "The Clairvoyant",
  wordCount: 1501,
  contentHtml: "<p>The corridor smelled of antiseptic and rain.</p><p>She counted the seconds.</p>",
  publishedAt: new Date("2026-05-10T00:00:00Z"),
  updatedAt: new Date("2026-05-25T00:00:00Z"),
};

describe("resolveChapterHeadline", () => {
  it("falls back to Chapter n when legacy imports echo the book title", () => {
    expect(resolveChapterHeadline(chapter, novel)).toBe("Chapter 3");
  });

  it("falls back to Chapter n when the title is blank", () => {
    expect(resolveChapterHeadline({ number: 7, title: "   " }, novel)).toBe("Chapter 7");
  });

  it("keeps a real chapter title", () => {
    expect(resolveChapterHeadline({ number: 4, title: "Flatline" }, novel)).toBe("Flatline");
  });
});

describe("buildChapterMetaDescription", () => {
  it("extracts body text instead of echoing the book title", () => {
    expect(buildChapterMetaDescription(chapter)).toBe(
      "The corridor smelled of antiseptic and rain. She counted the seconds.",
    );
  });

  it("truncates long bodies around the 155 char mark", () => {
    const long = { ...chapter, contentHtml: `<p>${"word ".repeat(60)}</p>` };
    const description = buildChapterMetaDescription(long);
    expect(description.length).toBeLessThanOrEqual(158);
    expect(description.endsWith("...")).toBe(true);
  });

  it("has a sane fallback when the body is empty", () => {
    expect(buildChapterMetaDescription({ ...chapter, contentHtml: "" })).toBe(
      "Read Chapter 3 of this AI story on AINovel.",
    );
  });
});

describe("buildNovelDetailJsonLd", () => {
  it("emits absolute URLs and complete Book fields", () => {
    const ld = buildNovelDetailJsonLd("https://ainovel.com", novel);
    expect(ld["@graph"]).toHaveLength(2);
    const [book, breadcrumb] = ld["@graph"] as Array<Record<string, unknown>>;
    expect(book).toMatchObject({
      "@type": "Book",
      url: "https://ainovel.com/novels/the-clairvoyant",
      image: "https://ainovel.com/images/ainovel/generated/novel-the-clairvoyant-832x1248-1.webp",
      inLanguage: "en",
      bookFormat: "https://schema.org/EBook",
    });
    const items = breadcrumb.itemListElement as Array<Record<string, unknown>>;
    expect(items[0].item).toBe("https://ainovel.com/");
    expect(items[2].item).toBe("https://ainovel.com/novels/the-clairvoyant");
  });

  it("omits the image field when the novel has no cover", () => {
    const ld = buildNovelDetailJsonLd("https://ainovel.com", { ...novel, coverUrl: null });
    const [book] = ld["@graph"] as Array<Record<string, unknown>>;
    expect(book.image).toBeUndefined();
  });
});

describe("buildNovelChapterJsonLd", () => {
  it("keys the Article to its parent Book with absolute URLs", () => {
    const ld = buildNovelChapterJsonLd("https://ainovel.com", novel, chapter);
    expect(ld).toMatchObject({
      "@type": "Article",
      headline: "Chapter 3 - The Clairvoyant",
      url: "https://ainovel.com/novels/the-clairvoyant/chapter/3",
      inLanguage: "en",
      wordCount: 1501,
      isPartOf: {
        "@type": "Book",
        url: "https://ainovel.com/novels/the-clairvoyant",
      },
    });
  });

  it("uses the real chapter title in the headline when present", () => {
    const ld = buildNovelChapterJsonLd("https://ainovel.com", novel, {
      ...chapter,
      title: "Flatline",
    });
    expect(ld.headline).toBe("Flatline - The Clairvoyant");
  });
});
