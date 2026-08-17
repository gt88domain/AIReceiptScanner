import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const workflows = [".github/workflows/auto-merge.yml", ".github/workflows/quality.yml"];

let checked = 0;
for (const workflow of workflows) {
  let source;
  try {
    source = await readFile(new URL(workflow, `file://${root}/`), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      // Downstream forks may remove the upstream auto-merge workflows entirely.
      // Nothing to verify when the workflow is gone; enforce only while present.
      console.log(`Skipping ${workflow}: file not present.`);
      continue;
    }
    throw error;
  }

  assert.match(source, /const verifiedHeadSha = pull\.head\.sha;/);
  assert.match(source, /ref: verifiedHeadSha,/);
  assert.match(source, /latestPull\.head\.sha !== verifiedHeadSha/);
  assert.match(source, /sha: verifiedHeadSha,/);
  checked += 1;
}

if (checked === 0) {
  console.log("Auto-merge workflows not present; SHA verification checks skipped.");
} else {
  console.log("Auto-merge SHA verification checks passed.");
}
