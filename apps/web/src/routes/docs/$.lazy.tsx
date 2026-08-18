// https://www.fumadocs.dev/docs/manual-installation/tanstack-start
import browserCollections from "fumadocs-mdx:collections/browser";
import { createLazyFileRoute, useLoaderData } from "@tanstack/react-router";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Suspense } from "react";
import { DocsProviders } from "@/components/providers/docs-providers";
import { getCurrentLocale, useTranslations } from "@/i18n";
import { baseOptions } from "@/lib/layout.shared";
import type { DocsLoaderData } from "./$";
import "@/styles/docs.css";

export const Route = createLazyFileRoute("/docs/$")({
  component: DocsPageRoute,
});

const clientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }, props: { className?: string }) {
    return (
      <DocsPage toc={toc} {...props}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export function preloadDocsContent(path: string) {
  return clientLoader.preload(path);
}

function DocsPageRoute() {
  const loaderData = useLoaderData({ from: "/docs/$" }) as DocsLoaderData | undefined;
  const t = useTranslations("contentDocs");
  if (!loaderData) return null;
  if (loaderData.empty) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-24 sm:px-6">
        <section className="w-full rounded-xl border border-dashed border-border p-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("empty")}</p>
        </section>
      </main>
    );
  }

  const data = useFumadocsLoader(loaderData);
  const locale = getCurrentLocale();

  return (
    <DocsProviders locale={locale}>
      <DocsLayout {...baseOptions()} tree={data.pageTree}>
        <Suspense>{clientLoader.useContent(data.path, { className: "" })}</Suspense>
      </DocsLayout>
    </DocsProviders>
  );
}
