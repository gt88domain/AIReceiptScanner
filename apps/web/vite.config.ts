import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { parse } from "jsonc-parser";
import { defineConfig, loadEnv } from "vite";
import * as MdxConfig from "./source.config";

const publicPages = [
  "/",
  "/privacy",
  "/terms",
  "/docs",
  "/zh",
  "/zh/privacy",
  "/zh/terms",
  "/zh/docs",
  "/jp",
  "/jp/privacy",
  "/jp/terms",
  "/jp/docs",
];

const publicPageEntries = publicPages.map((path) => ({
  path,
  prerender: {
    crawlLinks: false,
  },
}));

const devOptimizeDeps = ["@unpic/react"];

const nonPublicPrefixes = [
  "/auth",
  "/billing",
  "/credits",
  "/dashboard",
  "/settings",
  "/users",
  "/api",
  "/rpc",
];

const appDirectory = dirname(fileURLToPath(import.meta.url));

function isPrerenderablePath(path: string): boolean {
  if (path.includes("#")) {
    return false;
  }

  const normalizedPath = (path.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";

  return !nonPublicPrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
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
  const clientBuildEnv = Object.fromEntries(
    Object.keys(wranglerVars)
      .filter((key) => key.startsWith("VITE_"))
      .map((key) => [
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
    optimizeDeps: {
      include: devOptimizeDeps,
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      devtools(),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
        pages: publicPageEntries,
        prerender: {
          enabled: false,
          crawlLinks: true,
          autoStaticPathsDiscovery: false,
          filter: (page) => {
            const isPublicPath = isPrerenderablePath(page.path);
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
    ssr: {
      optimizeDeps: {
        include: devOptimizeDeps,
      },
    },
  };
});
