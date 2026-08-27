import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { measureHomepageAssets } from "./lib/measure-homepage-assets.mjs";

const sitemapPath = resolve(import.meta.dirname, "../apps/web/dist/client/sitemap.xml");

if (!existsSync(sitemapPath)) {
  throw new Error("Build the web app before checking the content sitemap surface.");
}

const sitemap = readFileSync(sitemapPath, "utf8");
if (/\/(?:zh\/|jp\/)?(?:docs|blog)(?:[\/<])/u.test(sitemap)) {
  throw new Error("Default sitemap must not include docs or blog URLs.");
}
if (sitemap.includes("design-system")) {
  throw new Error("The dev-only design-system gallery must not appear in the production sitemap.");
}

const assetsPath = resolve(import.meta.dirname, "../apps/web/dist/client/assets");
const assetNames = readdirSync(assetsPath);
const globalCssName = assetNames.find((name) => /^index-.+\.css$/u.test(name));
const galleryCssName = assetNames.find((name) => /^gallery-.+\.css$/u.test(name));
if (!globalCssName || !galleryCssName) {
  throw new Error("Build must emit separate global and gallery CSS assets.");
}
const globalCss = readFileSync(resolve(assetsPath, globalCssName), "utf8");
const galleryCss = readFileSync(resolve(assetsPath, galleryCssName), "utf8");
for (const skin of ["skin-catalog-blue", "skin-dark-entertainment"]) {
  if (globalCss.includes(skin) || !galleryCss.includes(skin)) {
    throw new Error(`${skin} must stay in the lazy gallery CSS, outside global production CSS.`);
  }
}
if (assetNames.some((name) => /(?:raleway|oxanium|logo-.+\.png)/u.test(name))) {
  throw new Error("The default build must not emit starter fonts or the legacy raster logo.");
}
const homepage = await measureHomepageAssets({
  clientAssetsDirectory: assetsPath,
  serverAssetsDirectory: resolve(import.meta.dirname, "../apps/web/dist/server/assets"),
});
if (homepage.initialRequests.some((name) => name.includes("turnstile"))) {
  throw new Error("The homepage must not preload Turnstile code before newsletter expansion.");
}

const robotsPath = resolve(import.meta.dirname, "../apps/web/dist/client/robots.txt");
if (!existsSync(robotsPath)) {
  throw new Error("Build must generate robots.txt alongside sitemap.xml.");
}
if (!/^Sitemap: https?:\/\/[^/]+\/sitemap\.xml$/mu.test(readFileSync(robotsPath, "utf8"))) {
  throw new Error("Generated robots.txt must point at the configured sitemap host.");
}

console.log("Default content surface check passed.");
