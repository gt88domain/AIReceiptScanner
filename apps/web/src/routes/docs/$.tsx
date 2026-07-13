// https://www.fumadocs.dev/docs/manual-installation/tanstack-start
import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Suspense } from "react";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, type Locale } from "@/i18n";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { buildSeoHead } from "@/utils/seo";

type DocsSeoData = {
  title: string;
  description?: string;
  url: string;
  canonicalPath: string;
};

type DocsLoaderData = {
  path: string;
  pageTree: Awaited<ReturnType<typeof source.serializePageTree>>;
  seo: DocsSeoData;
};

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = (params._splat ?? "").split("/").filter(Boolean);
    const lang = getCurrentLocale();
    const data = await serverLoader({ data: { slugs, lang } });
    await clientLoader.preload(data.path);
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
  component: Page,
});

const serverLoader = createServerFn({
  method: "GET",
})
  .inputValidator((data: { slugs: string[]; lang: Locale }) => data)
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

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    // you can define props for the component
    props: {
      className?: string;
    },
  ) {
    return (
      <DocsPage toc={toc} {...props}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const loaderData = Route.useLoaderData();
  if (!loaderData) {
    return null;
  }

  const data = useFumadocsLoader(loaderData);
  const locale = getCurrentLocale();

  return (
    <DocsLayout {...baseOptions(locale)} tree={data.pageTree}>
      <Suspense>
        {clientLoader.useContent(data.path, {
          className: "",
        })}
      </Suspense>
    </DocsLayout>
  );
}
