import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { measureHomepageAssets } from "./lib/measure-homepage-assets.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const clientAssetsDirectory = resolve(repositoryRoot, "apps/web/dist/client/assets");
const serverAssetsDirectory = resolve(repositoryRoot, "apps/web/dist/server/assets");
const reportDirectory = resolve(repositoryRoot, "artifacts/performance");
const bundleReport = JSON.parse(
  await readFile(resolve(reportDirectory, "bundle-report.json"), "utf8"),
);

const measured = await measureHomepageAssets({ clientAssetsDirectory, serverAssetsDirectory });
const budget = JSON.parse(
  await readFile(resolve(repositoryRoot, "apps/web/performance-budget.json"), "utf8"),
);
const forbiddenInitialRequests = budget.forbiddenInitialRequestTokens.filter((token) =>
  measured.initialRequests.some((asset) => asset.includes(token)),
);
const report = {
  generatedAt: new Date().toISOString(),
  method: "homepage route preloads plus their static imports from the production manifest",
  initialRequests: measured.initialRequests,
  initialRequestCount: measured.initialRequestCount,
  initialJavaScriptGzipBytes: measured.initialJavaScriptGzipBytes,
  initialCssGzipBytes: bundleReport.globalCss.gzipBytes,
  forbiddenInitialRequests,
};

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, "homepage-assets.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
