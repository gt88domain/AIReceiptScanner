import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const [budget, bundle, homepage] = await Promise.all(
  [
    "apps/web/performance-budget.json",
    "artifacts/performance/bundle-report.json",
    "artifacts/performance/homepage-assets.json",
  ].map(async (path) => JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"))),
);

const failures = [];
if (bundle.commonEntry.gzipBytes > budget.commonEntryGzipBytes) {
  failures.push(
    `Common entry gzip ${bundle.commonEntry.gzipBytes} exceeds ${budget.commonEntryGzipBytes}.`,
  );
}
if (bundle.globalCss.gzipBytes > budget.globalCssGzipBytes) {
  failures.push(
    `Global CSS gzip ${bundle.globalCss.gzipBytes} exceeds ${budget.globalCssGzipBytes}.`,
  );
}
if (homepage.forbiddenInitialRequests.length > 0) {
  failures.push(`Forbidden homepage assets: ${homepage.forbiddenInitialRequests.join(", ")}.`);
}
if (failures.length > 0) throw new Error(failures.join("\n"));

await writeFile(
  resolve(repositoryRoot, "artifacts/performance/baseline.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      budget,
      measured: {
        commonEntryGzipBytes: bundle.commonEntry.gzipBytes,
        globalCssGzipBytes: bundle.globalCss.gzipBytes,
        forbiddenInitialRequests: homepage.forbiddenInitialRequests,
      },
      result: "pass",
    },
    null,
    2,
  )}\n`,
);

console.log("Web performance budget passes.");
