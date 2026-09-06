import { createFileRoute } from "@tanstack/react-router";
import { buildNovelSitemap } from "@/modules/novels/public-seo";
import { novelServerClient } from "@/modules/novels/server-client";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // ponytail: the initial public catalog is bounded to 48 records; add
          // a cursor-backed sitemap procedure before importing a larger catalog.
          const [{ items }, chapterSitemap] = await Promise.all([
            novelServerClient.novels.list({ limit: 48, sort: "updated" }),
            novelServerClient.novels.chapters.sitemap(),
          ]);
          return new Response(
            buildNovelSitemap(new URL(request.url).origin, items, chapterSitemap.items),
            {
              headers: { "content-type": "application/xml; charset=utf-8" },
            },
          );
        } catch {
          return new Response("Sitemap temporarily unavailable", { status: 503 });
        }
      },
    },
  },
});
