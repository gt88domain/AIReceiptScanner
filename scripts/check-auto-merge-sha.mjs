import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const workflows = [".github/workflows/auto-merge.yml"];

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
  try {
    const autoMergeSource = await readFile(
      new URL(".github/workflows/auto-merge.yml", `file://${root}/`),
      "utf8",
    );
    const qualitySource = await readFile(
      new URL(".github/workflows/quality.yml", `file://${root}/`),
      "utf8",
    );
    const adoptionGuard = autoMergeSource.indexOf("const isUpstreamAdoption =");
    const squashMerge = autoMergeSource.indexOf('merge_method: "squash"');
    assert.ok(adoptionGuard >= 0 && adoptionGuard < squashMerge);
    assert.match(autoMergeSource, /repository_dispatch:/);
    assert.match(autoMergeSource, /types: \[release-checks-complete\]/);
    assert.match(autoMergeSource, /if \(dispatchedRelease && !isGeneratedRelease\) return;/);
    assert.match(autoMergeSource, /filenames\.includes\("\.template\/source\.json"\)/);
    assert.match(autoMergeSource, /labels\.has\("upstream-adoption"\)/);
    assert.match(autoMergeSource, /if \(isUpstreamAdoption\) return;/);
    assert.doesNotMatch(qualitySource, /github\.rest\.pulls\.merge/);
    assert.match(qualitySource, /github\.rest\.repos\.createDispatchEvent/);
    assert.match(qualitySource, /event_type: "release-checks-complete"/);
    assert.match(qualitySource, /pull-requests: read/);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  console.log("Auto-merge SHA verification checks passed.");
}
