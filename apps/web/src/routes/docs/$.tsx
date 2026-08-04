import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, type Locale } from "@/i18n";
import { source } from "@/lib/source";
import { buildSeoHead } from "@/utils/seo";

type DocsSeoData = {
  title: string;
  description?: string;
  url: string;
  canonicalPath: string;
};

export type DocsLoaderData = {
  path: string;
  pageTree: Awaited<ReturnType<typeof source.serializePageTree>>;
  seo: DocsSeoData;
};

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = (params._splat ?? "").split("/").filter(Boolean);
    const lang = getCurrentLocale();
    const data = await serverLoader({ data: { slugs, lang } });
    const { preloadDocsContent } = await import("./$.lazy");
    await preloadDocsContent(data.path);
    return data;
  },
  head: ({ loaderData }) => {
    const locale = getCurrentLocale();
    const seo = loaderData?.seo;

    if (!seo) {
      return buildSeoHead({
        locale,
        title: `${webConfig.AppName} Docs`,
        description: "Documentation",
        canonicalPath: "/docs",
        type: "article",
        siteName: webConfig.AppName,
        robots: "noindex,nofollow",
        alternates: false,
      });
    }

    const seoTitle = `${seo.title} | ${webConfig.AppName} Docs`;

    return buildSeoHead({
      locale,
      title: seoTitle,
      description: seo.description,
      canonicalPath: seo.canonicalPath,
      type: "article",
      siteName: webConfig.AppName,
      robots: "noindex,nofollow",
      alternates: false,
      ldJson: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: seo.title,
        description: seo.description,
        inLanguage: locale,
        url: seo.url,
      },
    });
  },
});

const serverLoader = createServerFn({
  method: "GET",
})
  .validator((data: { slugs: string[]; lang: Locale }) => data)
  .handler(async ({ data: { slugs, lang } }): Promise<DocsLoaderData> => {
    const page = source.getPage(slugs, lang);
    if (!page) throw notFound();
    const canonicalPath = slugs.length > 0 ? `/docs/${slugs.join("/")}` : "/docs";

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree(lang)),
      seo: {
        title: page.data.title ?? "Documentation",
        description: page.data.description,
        url: page.url,
        canonicalPath,
      },
    };
  });
