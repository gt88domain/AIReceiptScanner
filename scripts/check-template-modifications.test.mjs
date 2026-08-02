import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(root, "scripts/check-template-modifications.mjs");
const facts = await readFile(path.join(root, "template-kit/repository-facts.json"), "utf8");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function modification(overrides = {}) {
  return {
    id: "MOD-0001",
    classification: "product-specific",
    status: "active",
    paths: ["apps/server/src/storage"],
    owner: "owner@example.test",
    reason: "Buyer-specific behavior.",
    evidence: { tests: ["pnpm test:template"] },
    impact: { security: "low", data: "low", compatibility: "low" },
    ...overrides,
  };
}

async function setup(modifications = [modification()], sourceCommit = undefined) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "template-modifications-"));
  await mkdir(path.join(directory, "template-kit"), { recursive: true });
  await mkdir(path.join(directory, "apps/server/src/storage"), { recursive: true });
  await writeFile(path.join(directory, "template-kit/repository-facts.json"), facts);
  await writeFile(path.join(directory, "apps/server/src/storage/access.ts"), "export const baseline = true;\n");
  git(directory, "init", "--quiet");
  git(directory, "config", "user.email", "test@example.test");
  git(directory, "config", "user.name", "Template test");
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "baseline");
  const commit = sourceCommit ?? git(directory, "rev-parse", "HEAD");
  await mkdir(path.join(directory, ".template/modifications"), { recursive: true });
  await writeFile(
    path.join(directory, ".template/source.json"),
    JSON.stringify({ upstream: { commit }, adoptedAt: "2026-08-02" }),
  );
  for (const [index, value] of modifications.entries()) {
    await writeFile(
      path.join(directory, `.template/modifications/MOD-${String(index + 1).padStart(4, "0")}.json`),
      JSON.stringify({ ...value, id: `MOD-${String(index + 1).padStart(4, "0")}` }),
    );
  }
  await writeFile(path.join(directory, "apps/server/src/storage/access.ts"), "export const changed = true;\n");
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "feat: downstream change");
  return directory;
}

async function runFixture(modifications, sourceCommit) {
  const directory = await setup(modifications, sourceCommit);
  try {
    return { output: execFileSync("node", [checker], { cwd: directory, encoding: "utf8", stdio: "pipe" }) };
  } catch (error) {
    return { error: String(error.stderr) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("accepts a valid protected-path modification", async () => {
  const result = await runFixture([modification()]);
  assert.match(result.output, /passed/);
});

test("rejects missing, overlapping, and incomplete records", async () => {
  assert.match((await runFixture([])).error, /requires exactly one active/);
  assert.match((await runFixture([modification(), modification()])).error, /overlaps/);
  assert.match((await runFixture([modification({ evidence: { tests: [] } })])).error, /evidence\.tests/);
});

test("rejects invalid upstream candidate and expired temporary workaround", async () => {
  assert.match(
    (await runFixture([modification({ classification: "upstream-candidate" })])).error,
    /upstream\.reference/,
  );
  assert.match(
    (await runFixture([
      modification({
        classification: "temporary-workaround",
        review: { deadline: "2000-01-01", removalCondition: "Remove after upstream fix." },
      }),
    ])).error,
    /deadline has passed/,
  );
});

test("rejects a source commit that is not reachable", async () => {
  const result = await runFixture([modification()], "deadbeef");
  assert.match(result.error, /upstream\.commit must be an ancestor/);
});
