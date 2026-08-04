import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "template-upgrade-check.mjs",
);

function git(directory, ...args) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
}

async function write(directory, file, content) {
  const destination = path.join(directory, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

async function fixture(kind) {
  const directory = await mkdtemp(path.join(tmpdir(), "easystarter-upgrade-check-"));
  git(directory, "init", "-b", "main");
  git(directory, "config", "user.email", "test@example.test");
  git(directory, "config", "user.name", "Upgrade Check Test");
  await write(
    directory,
    "template-kit/repository-facts.json",
    JSON.stringify({ governance: { coreRoots: ["apps/server/src/lib"], platformModuleRoots: [] } }),
  );
  await write(directory, "template-kit/downstream-manifest.schema.json", "{}");
  await write(directory, "apps/server/src/lib/core.ts", "export const core = 'base';\n");
  await write(directory, "apps/server/src/db/migrations/0001.sql", "-- base\n");
  await write(directory, "docs/base.md", "base\n");
  git(directory, "add", ".");
  git(directory, "commit", "-m", "base");
  const base = git(directory, "rev-parse", "HEAD");
  git(directory, "tag", "v0.4.0");

  const targetFile =
    kind === "migration"
      ? "apps/server/src/db/migrations/0001.sql"
      : kind === "core"
        ? "apps/server/src/lib/core.ts"
        : "docs/base.md";
  await write(directory, targetFile, `upstream-${kind}\n`);
  git(directory, "add", ".");
  git(directory, "commit", "-m", "upstream target");
  git(directory, "tag", "v0.4.1");
  git(directory, "checkout", "-b", "downstream", "v0.4.0");

  await write(
    directory,
    ".template/source.json",
    JSON.stringify({
      template: "easystarter-template",
      upstream: {
        repository: "https://github.com/gt88domain/easystarter-template",
        release: "v0.4.0",
        commit: base,
      },
      adoptedAt: "2026-08-04",
    }),
  );
  if (kind !== "docs") await write(directory, targetFile, `downstream-${kind}\n`);
  git(directory, "add", ".");
  git(directory, "commit", "-m", "downstream changes");
  git(directory, "remote", "add", "template", directory);
  return directory;
}

function run(directory, extraArgs = []) {
  return spawnSync(process.execPath, [script, "--from", "v0.4.0", "--to", "v0.4.1", "--json", ...extraArgs], {
    cwd: directory,
    encoding: "utf8",
  });
}

test("reports a low-risk documentation upgrade without writing the worktree", async () => {
  const directory = await fixture("docs");
  const before = git(directory, "status", "--porcelain");
  const result = run(directory);
  const after = git(directory, "status", "--porcelain");

  assert.equal(result.status, 0);
  assert.equal(before, after);
  assert.equal(JSON.parse(result.stdout).risk, "low");
});

test("reports high risk when both sides modify a protected core path", async () => {
  const result = run(await fixture("core"));
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).risk, "high");
});

test("blocks when both sides modify migration history", async () => {
  const result = run(await fixture("migration"));
  const report = JSON.parse(result.stdout);
  assert.equal(result.status, 3);
  assert.equal(report.risk, "blocked");
  assert.equal(report.migrationRisk, "manual review required");
});

test("prints help without requiring a downstream manifest", () => {
  const result = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Read-only downstream upgrade assessment/);
});

test("suggests no-Jobs configuration removal without writing the worktree", async () => {
  const directory = await fixture("docs");
  const before = git(directory, "status", "--porcelain");
  const result = run(directory, ["--profile", "directory-lite"]);
  assert.equal(result.status, 0);
  assert.equal(git(directory, "status", "--porcelain"), before);
  assert.deepEqual(JSON.parse(result.stdout).suggestedConfigurationChanges, [
    "Remove Queue producer binding.",
    "Remove Queue consumers.",
    "Remove DLQ consumer.",
    "Remove Cron trigger.",
    "Remove JOB_QUEUE_DLQ_NAME.",
  ]);
});
