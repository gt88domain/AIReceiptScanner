import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const workflow of [".github/workflows/auto-merge.yml", ".github/workflows/quality.yml"]) {
  const source = await readFile(new URL(workflow, `file://${root}/`), "utf8");

  assert.match(source, /const verifiedHeadSha = pull\.head\.sha;/);
  assert.match(source, /ref: verifiedHeadSha,/);
  assert.match(source, /latestPull\.head\.sha !== verifiedHeadSha/);
  assert.match(source, /sha: verifiedHeadSha,/);
}

console.log("Auto-merge SHA verification checks passed.");
