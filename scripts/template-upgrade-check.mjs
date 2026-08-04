import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const databaseRoots = [
  "apps/server/src/db/schema",
  "apps/server/src/db/migrations",
  "apps/server/src/db/migrations/meta",
  "apps/server/drizzle.config.ts",
];
const highRiskRoots = [
  "apps/server/src/auth",
  "apps/server/src/payments",
  "apps/server/src/credits",
  "apps/server/src/modules/jobs",
  "apps/server/src/storage",
  "apps/server/src/lib",
  "packages",
];

function usage() {
  console.log(`Usage: pnpm template:upgrade-check [--from vX.Y.Z] [--to vX.Y.Z] [--remote template] [--profile profile-id] [--json] [--verbose]

Read-only downstream upgrade assessment. It never fetches, merges, rebases, writes manifests, runs migrations, or changes the working tree.`);
}

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function has(name) {
  return args.includes(name);
}

function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const message = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${gitArgs.join(" ")} failed: ${message}`);
  }
}

function normalize(value) {
  return value.replace(/^\.\//, "").replace(/\/+$/, "");
}

function overlaps(left, right) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(`${normalizedRight}/`) ||
    normalizedRight.startsWith(`${normalizedLeft}/`)
  );
}

function inRoots(file, roots) {
  return roots.some((rootPath) => overlaps(file, rootPath));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readSource() {
  const sourcePath = path.join(root, ".template", "source.json");
  try {
    return await readJson(sourcePath);
  } catch {
    throw new Error(
      "Missing or invalid .template/source.json. Copy template-kit/downstream-manifest.example.json first.",
    );
  }
}

async function readProtectedRoots() {
  try {
    const facts = await readJson(path.join(root, "template-kit", "repository-facts.json"));
    return [
      ...(facts.governance?.coreRoots ?? []),
      ...(facts.governance?.platformModuleRoots ?? []),
    ].map(normalize);
  } catch {
    throw new Error("Missing or invalid template-kit/repository-facts.json.");
  }
}

async function readModificationPaths() {
  const directory = path.join(root, ".template", "modifications");
  const files = await readdir(directory).catch(() => []);
  const paths = [];
  for (const file of files.filter((entry) => /^MOD-\d{4}\.json$/.test(entry)).sort()) {
    const modification = await readJson(path.join(directory, file));
    if (modification.status !== "active") continue;
    for (const modifiedPath of modification.paths ?? []) paths.push(normalize(modifiedPath));
  }
  return paths;
}

function resolveTag(ref) {
  return git("rev-parse", "--verify", `${ref}^{commit}`);
}

function listChangedFiles(from, to) {
  return git("diff", "--name-only", `${from}..${to}`).split("\n").filter(Boolean);
}

function latestReleaseTag() {
  return git("tag", "--list", "v*", "--sort=-v:refname").split("\n").find(Boolean);
}

function riskFor({ upstreamChanged, downstreamChanged, overlap, sourceModifiedPaths }) {
  const upstreamDatabase = upstreamChanged.filter((file) => inRoots(file, databaseRoots));
  const downstreamDatabase = downstreamChanged.filter((file) => inRoots(file, databaseRoots));
  if (upstreamDatabase.length > 0 && downstreamDatabase.length > 0) {
    return {
      level: "blocked",
      reason: "Migration or database history changed on both sides.",
      migrationRisk: "manual review required",
    };
  }
  const protectedOverlap = overlap.filter((file) => inRoots(file, highRiskRoots));
  if (protectedOverlap.length > 0) {
    return {
      level: "high",
      reason: "Both sides changed a protected runtime contract.",
      migrationRisk: "none",
    };
  }
  if (overlap.length > 0 || sourceModifiedPaths.length > 0) {
    return {
      level: "medium",
      reason: "Protected configuration or manifest paths overlap.",
      migrationRisk: "none",
    };
  }
  return {
    level: "low",
    reason: "No protected-path or database overlap was found.",
    migrationRisk: "none",
  };
}

function renderText(report) {
  const lines = [
    "EasyStarter Upgrade Check",
    "",
    "Current adoption:",
    `  Version: ${report.current.version}`,
    `  Commit: ${report.current.commit}`,
    "",
    "Target:",
    `  Version: ${report.target.version}`,
    `  Commit: ${report.target.commit}`,
    "",
    `Upstream changed files: ${report.upstreamChangedFiles.length}`,
    `Downstream protected modifications: ${report.downstreamProtectedFiles.length}`,
    `Overlapping protected paths: ${report.overlappingProtectedPaths.length || "none"}`,
    `Database paths changed upstream: ${report.database.upstream.length > 0 ? "yes" : "no"}`,
    `Database paths changed downstream: ${report.database.downstream.length > 0 ? "yes" : "no"}`,
    `Migration risk: ${report.migrationRisk}`,
    `Expected merge risk: ${report.risk}`,
    "",
    "Recommended next step:",
    report.risk === "blocked"
      ? "  Do not run db:migrate. Review migration history manually."
      : `  create chore/adopt-easystarter-${report.target.version.replace(/^v/, "v")}`,
  ];
  if (report.workingTreeDirty)
    lines.push("", "Warning: working tree was already dirty; it was not changed.");
  if (report.overlappingProtectedPaths.length > 0) {
    lines.push("", ...report.overlappingProtectedPaths.map((file) => `  - ${file}`));
  }
  if (has("--verbose")) {
    lines.push(
      "",
      "Upstream changed paths:",
      ...(report.upstreamChangedFiles.length > 0
        ? report.upstreamChangedFiles.map((file) => `  - ${file}`)
        : ["  - none"]),
      "Downstream protected paths:",
      ...(report.downstreamProtectedFiles.length > 0
        ? report.downstreamProtectedFiles.map((file) => `  - ${file}`)
        : ["  - none"]),
    );
  }
  if (report.suggestedConfigurationChanges.length > 0) {
    lines.push("", "Suggested configuration changes:", ...report.suggestedConfigurationChanges.map((item) => `  - ${item}`));
  }
  lines.push("", "No files or Cloudflare resources were modified. No SQL was executed.");
  return lines.join("\n");
}

function exitCode(risk) {
  return risk === "blocked" ? 3 : risk === "high" ? 2 : 0;
}

async function main() {
  if (has("--help") || has("-h")) return usage();
  const before = git("status", "--porcelain");
  let report;
  try {
    const remote = option("--remote") ?? "template";
    try {
      git("remote", "get-url", remote);
    } catch {
      throw new Error(
        `Missing upstream remote '${remote}'. Run: git remote add ${remote} https://github.com/gt88domain/easystarter-template.git`,
      );
    }
    const source = await readSource();
    await readJson(path.join(root, "template-kit", "downstream-manifest.schema.json"));
    if (source.template !== "easystarter-template") {
      throw new Error(".template/source.json must identify easystarter-template.");
    }
    const fromVersion = option("--from") ?? source.upstream?.release;
    const fromCommit = source.upstream?.commit;
    const toVersion = option("--to") ?? latestReleaseTag();
    if (!fromVersion || !fromCommit || !toVersion) {
      throw new Error("Source release/commit or target release is unavailable.");
    }
    try {
      git("merge-base", "--is-ancestor", fromCommit, "HEAD");
    } catch {
      throw new Error("The adopted source commit is not an ancestor of HEAD.");
    }
    const targetCommit = resolveTag(toVersion);
    const protectedRoots = await readProtectedRoots();
    const upstreamChanged = listChangedFiles(fromCommit, targetCommit);
    const downstreamChanged = listChangedFiles(fromCommit, "HEAD");
    const downstreamProtected = downstreamChanged.filter((file) => inRoots(file, protectedRoots));
    const sourceModifiedPaths = await readModificationPaths();
    const overlap = upstreamChanged.filter(
      (file) =>
        inRoots(file, protectedRoots) &&
        (downstreamProtected.includes(file) ||
          sourceModifiedPaths.some((modified) => overlaps(file, modified))),
    );
    const assessed = riskFor({ upstreamChanged, downstreamChanged, overlap, sourceModifiedPaths });
    const profileId = option("--profile");
    const suggestedConfigurationChanges = profileId === "directory-lite"
      ? [
          "Remove Queue producer binding.",
          "Remove Queue consumers.",
          "Remove DLQ consumer.",
          "Remove Cron trigger.",
          "Remove JOB_QUEUE_DLQ_NAME.",
        ]
      : [];
    report = {
      current: { version: fromVersion, commit: fromCommit },
      target: { version: toVersion, commit: targetCommit },
      upstreamChangedFiles: upstreamChanged,
      downstreamProtectedFiles: downstreamProtected,
      downstreamModificationPaths: sourceModifiedPaths,
      overlappingProtectedPaths: overlap,
      database: {
        upstream: upstreamChanged.filter((file) => inRoots(file, databaseRoots)),
        downstream: downstreamChanged.filter((file) => inRoots(file, databaseRoots)),
      },
      migrationRisk: assessed.migrationRisk,
      risk: assessed.level,
      reason: assessed.reason,
      suggestedConfigurationChanges,
      workingTreeDirty: before.length > 0,
    };
  } catch (error) {
    report = {
      risk: "blocked",
      migrationRisk: "unknown",
      error: error instanceof Error ? error.message : String(error),
      workingTreeDirty: before.length > 0,
    };
  }
  const after = git("status", "--porcelain");
  if (after !== before) {
    report = {
      risk: "blocked",
      migrationRisk: "unknown",
      error: "Working tree changed during upgrade check.",
      workingTreeDirty: true,
    };
  }
  if (has("--json")) console.log(JSON.stringify(report, null, 2));
  else if (report.error) console.error(`EasyStarter Upgrade Check blocked: ${report.error}`);
  else console.log(renderText(report));
  process.exitCode = exitCode(report.risk);
}

await main();
