import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const assetsDirectory = resolve(repositoryRoot, "apps/web/dist/client/assets");
const reportDirectory = resolve(repositoryRoot, "artifacts/performance");
const bundleReport = JSON.parse(
  await readFile(resolve(reportDirectory, "bundle-report.json"), "utf8"),
);

const visited = new Set();
async function collectStaticImports(name) {
  if (visited.has(name)) return;
  visited.add(name);
  if (!name.endsWith(".js")) return;

  const contents = await readFile(resolve(assetsDirectory, name), "utf8");
  const imports = [...contents.matchAll(/from["']\.\/([^"']+\.js)["']/g)].map((match) => match[1]);
  await Promise.all(imports.map(collectStaticImports));
}

await collectStaticImports(bundleReport.commonEntry.name);
visited.add(bundleReport.globalCss.name);
const initialRequests = [...visited].sort();
const budget = JSON.parse(
  await readFile(resolve(repositoryRoot, "apps/web/performance-budget.json"), "utf8"),
);
const forbiddenInitialRequests = budget.forbiddenInitialRequestTokens.filter((token) =>
  initialRequests.some((asset) => asset.includes(token)),
);
const report = {
  generatedAt: new Date().toISOString(),
  method: "static production entry graph; browser timing remains an optional local diagnostic",
  initialRequests,
  initialRequestCount: initialRequests.length,
  initialJavaScriptGzipBytes: bundleReport.commonEntry.gzipBytes,
  initialCssGzipBytes: bundleReport.globalCss.gzipBytes,
  forbiddenInitialRequests,
};

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, "homepage-assets.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
