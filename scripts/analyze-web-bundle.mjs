import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const repositoryRoot = resolve(import.meta.dirname, "..");
const assetsDirectory = resolve(repositoryRoot, "apps/web/dist/client/assets");
const reportDirectory = resolve(repositoryRoot, "artifacts/performance");

async function assetStats(name) {
  const path = resolve(assetsDirectory, name);
  const contents = await readFile(path);
  return {
    name,
    rawBytes: (await stat(path)).size,
    gzipBytes: gzipSync(contents).length,
    contents: name.endsWith(".js") || name.endsWith(".css") ? contents.toString("utf8") : undefined,
  };
}

const assets = await Promise.all((await readdir(assetsDirectory)).map(assetStats));
const scripts = assets.filter((asset) => asset.name.endsWith(".js"));
const styles = assets.filter((asset) => asset.name.endsWith(".css"));
const commonEntry = scripts
  .filter((asset) => asset.name.startsWith("index-"))
  .sort((left, right) => right.gzipBytes - left.gzipBytes)[0];
const globalCss = styles
  .filter((asset) => !asset.contents?.includes("--fd"))
  .sort((left, right) => right.gzipBytes - left.gzipBytes)[0];
const docsCss = styles.find((asset) => asset.contents?.includes("--fd"));

if (!commonEntry || !globalCss) {
  throw new Error("Web build is missing the expected common JavaScript or global CSS asset.");
}

const report = {
  generatedAt: new Date().toISOString(),
  commonEntry: {
    name: commonEntry.name,
    rawBytes: commonEntry.rawBytes,
    gzipBytes: commonEntry.gzipBytes,
  },
  globalCss: {
    name: globalCss.name,
    rawBytes: globalCss.rawBytes,
    gzipBytes: globalCss.gzipBytes,
  },
  docsCss: docsCss && {
    name: docsCss.name,
    rawBytes: docsCss.rawBytes,
    gzipBytes: docsCss.gzipBytes,
  },
  largestScripts: scripts
    .sort((left, right) => right.gzipBytes - left.gzipBytes)
    .slice(0, 20)
    .map(({ name, rawBytes, gzipBytes }) => ({ name, rawBytes, gzipBytes })),
  largestStyles: styles
    .sort((left, right) => right.gzipBytes - left.gzipBytes)
    .map(({ name, rawBytes, gzipBytes }) => ({ name, rawBytes, gzipBytes })),
};

await mkdir(reportDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(reportDirectory, "bundle-report.json"), `${JSON.stringify(report, null, 2)}\n`),
  writeFile(
    resolve(reportDirectory, "bundle-report.md"),
    [
      "# Web bundle report",
      "",
      `- Common entry: ${report.commonEntry.name} — ${report.commonEntry.rawBytes} raw bytes / ${report.commonEntry.gzipBytes} gzip bytes`,
      `- Global CSS: ${report.globalCss.name} — ${report.globalCss.rawBytes} raw bytes / ${report.globalCss.gzipBytes} gzip bytes`,
      report.docsCss
        ? `- Docs CSS: ${report.docsCss.name} — ${report.docsCss.rawBytes} raw bytes / ${report.docsCss.gzipBytes} gzip bytes`
        : "- Docs CSS: not emitted",
      "",
      "The full route tree can reference lazy chunks; this report measures only the common entry asset.",
      "",
    ].join("\n"),
  ),
]);

console.log(JSON.stringify(report, null, 2));
