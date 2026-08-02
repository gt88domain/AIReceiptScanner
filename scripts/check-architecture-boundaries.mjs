import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceFile = /\.(?:[cm]?[jt]sx?)$/;

async function findSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findSourceFiles(entryPath);
      return sourceFile.test(entry.name) ? [entryPath] : [];
    }),
  );
  return files.flat();
}

async function checkDirectory(label, directory, patterns) {
  const violations = [];
  for (const file of await findSourceFiles(directory)) {
    const source = await readFile(file, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(source)) violations.push(`${label}: ${path.relative(process.cwd(), file)}`);
    }
  }
  return violations;
}

const violations = [
  ...(await checkDirectory("shared package imports a platform/provider", "packages/shared", [
    /from\s+["'](?:react-native|expo(?:\/[^"']*)?|react-native-purchases|stripe|cloudflare:workers)["']/,
  ])),
  ...(await checkDirectory("product UI imports server database internals", "apps/web/src/modules", [
    /from\s+["'](?:@server\/db|@\/db|.*apps\/server\/src\/db)["']/,
    /from\s+["']drizzle-orm(?:\/[^"']*)?["']/,
  ])),
  ...(await checkDirectory("product code imports server database internals", "products", [
    /from\s+["'](?:@server\/db|@\/db|.*apps\/server\/src\/db)["']/,
    /from\s+["']drizzle-orm(?:\/[^"']*)?["']/,
  ])),
];

if (violations.length > 0) {
  throw new Error(`Architecture boundary violations:\n${violations.join("\n")}`);
}

console.log("Architecture boundary check passed.");
