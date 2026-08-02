import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceFile = /\.(?:[cm]?[jt]sx?)$/;
const root = process.cwd();
const facts = JSON.parse(
  await readFile(path.join(root, "template-kit/repository-facts.json"), "utf8"),
);

async function findSourceFiles(directory, excludedDirectories = []) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (excludedDirectories.some((excluded) => entryPath === excluded || entryPath.startsWith(`${excluded}/`))) {
        return [];
      }
      if (entry.isDirectory()) return findSourceFiles(entryPath, excludedDirectories);
      return sourceFile.test(entry.name) ? [entryPath] : [];
    }),
  );
  return files.flat();
}

async function checkDirectory(rule, directory) {
  const violations = [];
  const patterns = rule.forbiddenImportPatterns.map((pattern) => new RegExp(pattern));
  const excludedDirectories = (rule.excludeDirectories ?? []).map((excluded) => path.join(root, excluded));
  for (const file of await findSourceFiles(directory, excludedDirectories)) {
    const source = await readFile(file, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        violations.push(`${rule.id}: ${path.relative(root, file)}`);
        break;
      }
    }
  }
  return violations;
}

const rules = facts.governance?.boundaryRules ?? [];
const violations = (
  await Promise.all(
    rules.flatMap((rule) =>
      rule.directories.map((directory) => checkDirectory(rule, path.join(root, directory))),
    ),
  )
).flat();

if (violations.length > 0) {
  throw new Error(`Architecture boundary violations:\n${violations.join("\n")}`);
}

console.log("Architecture boundary check passed.");
