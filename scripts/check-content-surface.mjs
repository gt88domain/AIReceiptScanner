import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const sitemapPath = resolve(import.meta.dirname, "../apps/web/dist/client/sitemap.xml");

if (!existsSync(sitemapPath)) {
  throw new Error("Build the web app before checking the content sitemap surface.");
}

const sitemap = readFileSync(sitemapPath, "utf8");
if (/\/(?:zh\/|jp\/)?(?:docs|blog)(?:[\/<])/u.test(sitemap)) {
  throw new Error("Default sitemap must not include docs or blog URLs.");
}

const robotsPath = resolve(import.meta.dirname, "../apps/web/dist/client/robots.txt");
if (!existsSync(robotsPath)) {
  throw new Error("Build must generate robots.txt alongside sitemap.xml.");
}
if (!/^Sitemap: https?:\/\/[^/]+\/sitemap\.xml$/mu.test(readFileSync(robotsPath, "utf8"))) {
  throw new Error("Generated robots.txt must point at the configured sitemap host.");
}

console.log("Default content surface check passed.");
