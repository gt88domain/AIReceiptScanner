import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { frontmatter } from "fumadocs-core/content/md/frontmatter";
import { parse } from "jsonc-parser";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { defaultLocale, isValidLocale, supportedLocales } from "../../packages/i18n/src/locales.ts";
import * as MdxConfig from "./source.config";
import { createRobotsTxt } from "./scripts/robots.mjs";
import { nonPublicPathPrefixes } from "./src/configs/non-public-paths";
import {
  createPublishedPublicPages,
  isPrerenderablePath,
  stripPublishedLocalePrefix,
} from "./src/configs/publication-paths";

const appDirectory = dirname(fileURLToPath(import.meta.url));

type ContentPage = {
  locale: string;
  path: string;
  lastmod: string;
};

function getPublishedContentPages(collection: string): ContentPage[] {
  const directory = resolve(appDirectory, "content", collection);
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { recursive: true })
    .filter((entry) => String(entry).endsWith(".mdx"))
    .flatMap((entry) => {
      const filePath = resolve(directory, String(entry));
      const data = frontmatter(readFileSync(filePath, "utf8")).data as { published?: boolean };
      if (data.published === false) return [];

      const [locale, ...slugParts] = relative(directory, filePath)
        .replace(/\\/g, "/")
        .replace(/\.mdx$/, "")
        .split("/");
      if (!locale || slugParts.length === 0 || !isValidLocale(locale)) return [];

      const slug = slugParts.at(-1) === "index" ? slugParts.slice(0, -1) : slugParts;
      const localePrefix = locale === defaultLocale ? "" : `/${locale}`;
      return [
        {
          locale,
          path: `${localePrefix}/${collection}${slug.length > 0 ? `/${slug.join("/")}` : ""}`,
          lastmod: statSync(filePath).mtime.toISOString(),
        },
      ];
    });
}

function robotsTxtPlugin(sitemapHost: string | undefined): Plugin {
  return {
    name: "generate-robots-txt",
    apply: "build" as const,
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: createRobotsTxt(sitemapHost, nonPublicPathPrefixes),
      });
    },
  };
}

import { contentSurfaceFlags } from "@repo/app-config/content-flags";

// Capability switch (product enables the docs/blog surface) and public-entry
// visibility (capability on AND published content present) are separate states:
// navigation, sitemap, and search entries must only appear for the latter.
const docsEnabled = contentSurfaceFlags.docs;
const blogEnabled = contentSurfaceFlags.blog;
const docsPages = docsEnabled ? getPublishedContentPages("docs") : [];
const blogPages = blogEnabled ? getPublishedContentPages("blog") : [];
const docsPublic = docsPages.length > 0;
const blogPublic = blogPages.length > 0;
const publishedPublicPages = createPublishedPublicPages({ defaultLocale, supportedLocales });

const blogIndexPages = [...new Set(blogPages.map(({ locale }) => locale))].map((locale) => ({
  path: `${locale === defaultLocale ? "" : `/${locale}`}/blog`,
}));
const contentPageEntries = [...docsPages, ...blogPages].map(({ path, lastmod }) => ({
  path,
  sitemap: { lastmod },
}));
const publicPageEntries = [
  ...publishedPublicPages.map((path) => ({
    path,
    prerender: {
      crawlLinks: false,
    },
  })),
  ...blogIndexPages,
  ...contentPageEntries,
];

function isContentSurfaceEnabled(path: string): boolean {
  const normalizedPath = stripPublishedLocalePrefix(path, supportedLocales);
  if (normalizedPath === "/docs" || normalizedPath.startsWith("/docs/")) {
    return docsPublic;
  }
  if (normalizedPath === "/blog" || normalizedPath.startsWith("/blog/")) {
    return blogPublic;
  }
  return true;
}

function loadWranglerVars(): Record<string, string> {
  const config = parse(readFileSync(resolve(appDirectory, "wrangler.jsonc"), "utf8")) as {
    vars?: Record<string, string>;
  };

  return config.vars ?? {};
}

function resolveBuildEnvValue(
  key: string,
  sources: ReadonlyArray<Record<string, string | undefined>>,
): string | undefined {
  for (const source of sources) {
    const value = source[key];
    if (value) {
      return value;
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appDirectory, "");
  const wranglerVars = loadWranglerVars();
  const publicClientEnvKeys = [
    "VITE_SERVER_URL",
    "VITE_APP_URL",
    "VITE_TURNSTILE_SITE_KEY",
    "VITE_GA_MEASUREMENT_ID",
    "VITE_OPENPANEL_CLIENT_ID",
    "VITE_TEMPLATE_PREVIEW",
  ] as const;
  const clientBuildEnv = Object.fromEntries(
    publicClientEnvKeys.map((key) => [
      `import.meta.env.${key}`,
      JSON.stringify(resolveBuildEnvValue(key, [process.env, env, wranglerVars]) ?? ""),
    ]),
  );
  clientBuildEnv.__EASYSTARTER_PROFILE_BUILD__ = JSON.stringify(
    process.env.EASYSTARTER_PROFILE_BUILD ?? "",
  );
  clientBuildEnv.__EASYSTARTER_BACKOFFICE_PREVIEW_TICKETS__ = JSON.stringify(
    process.env.BACKOFFICE_PREVIEW_TICKETS ?? "",
  );
  clientBuildEnv["import.meta.env.VITE_CONTENT_DOCS_ENABLED"] = JSON.stringify(String(docsEnabled));
  clientBuildEnv["import.meta.env.VITE_CONTENT_BLOG_ENABLED"] = JSON.stringify(String(blogEnabled));
  clientBuildEnv["import.meta.env.VITE_CONTENT_DOCS_PUBLIC"] = JSON.stringify(String(docsPublic));
  clientBuildEnv["import.meta.env.VITE_CONTENT_BLOG_PUBLIC"] = JSON.stringify(String(blogPublic));
  const sitemapHost = resolveBuildEnvValue("VITE_APP_URL", [
    process.env,
    env,
    wranglerVars,
  ])?.replace(/\/+$/, "");

  // development: .env, .env.local, .env.development, .env.development.local
  // production: .env, .env.local, .env.production, .env.production.local
  return {
    define: clientBuildEnv,
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: 3000,
    },
    plugins: [
      robotsTxtPlugin(sitemapHost),
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      // Two TanStack dev servers on one machine otherwise crash on the fixed
      // devtools event-bus port (42069); point each extra worktree at its own.
      devtools({
        eventBusConfig: { port: Number(process.env.TANSTACK_DEVTOOLS_BUS_PORT ?? 42069) },
      }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
        pages: publicPageEntries,
        prerender: {
          enabled: false,
          crawlLinks: true,
          autoStaticPathsDiscovery: false,
          filter: (page) => {
            const isPublicPath =
              isPrerenderablePath(page.path, supportedLocales) &&
              isContentSurfaceEnabled(page.path);
            if (!isPublicPath) {
              page.sitemap = {
                ...page.sitemap,
                exclude: true,
              };
            }
            return isPublicPath;
          },
        },
        sitemap: {
          enabled: true,
          host: sitemapHost,
        },
      }),
      viteReact({
        // https://react.dev/learn/react-compiler
        babel: {
          plugins: [
            [
              "babel-plugin-react-compiler",
              {
                target: "19",
              },
            ],
          ],
        },
      }),
      mdx(MdxConfig),
    ],
  };
});
