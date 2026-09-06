import { NOVEL_TAG_INDEX_THRESHOLD, novelCategories, novelTagCounts } from "./taxonomy";

type SitemapNovel = {
  seoNoindex: boolean;
  slug: string;
  updatedAt: Date;
};

type SitemapChapter = {
  novelSlug: string;
  number: number;
  updatedAt: Date;
};

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "'": "&apos;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  );
}
function sitemapUrl(origin: string, path: string, updatedAt?: Date): string {
  const lastmod = updatedAt ? `<lastmod>${updatedAt.toISOString().slice(0, 10)}</lastmod>` : "";
  return `<url><loc>${escapeXml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
}

export function buildNovelSitemap(
  origin: string,
  novels: SitemapNovel[],
  chapters: SitemapChapter[] = [],
): string {
  const staticUrls = [
    sitemapUrl(origin, "/"),
    sitemapUrl(origin, "/novels"),
    sitemapUrl(origin, "/worlds"),
    sitemapUrl(origin, "/ranking"),
    sitemapUrl(origin, "/forums"),
    ...Object.keys(novelCategories).map((slug) => sitemapUrl(origin, `/categories/${slug}`)),
    ...Object.entries(novelTagCounts)
      .filter(([, count]) => count >= NOVEL_TAG_INDEX_THRESHOLD)
      .map(([slug]) => sitemapUrl(origin, `/tags/novels/${slug}`)),
  ];
  const detailUrls = novels
    .filter((novel) => !novel.seoNoindex)
    .map((novel) => sitemapUrl(origin, `/novels/${novel.slug}`, novel.updatedAt));
  const chapterUrls = chapters.map((chapter) =>
    sitemapUrl(origin, `/novels/${chapter.novelSlug}/chapter/${chapter.number}`, chapter.updatedAt),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...detailUrls, ...chapterUrls].join("")}</urlset>`;
}

export function buildRobotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /auth/",
    "Disallow: /billing/",
    "Disallow: /credits/",
    "Disallow: /dashboard/",
    "Disallow: /settings/",
    "Disallow: /users/",
    "",
    `Sitemap: ${new URL("/sitemap.xml", origin).href}`,
    "",
  ].join("\n");
}
