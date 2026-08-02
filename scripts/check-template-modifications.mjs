import { access, readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, ".template/source.json");
const modificationsDirectory = path.join(root, ".template/modifications");
const facts = JSON.parse(
  await readFile(path.join(root, "template-kit/repository-facts.json"), "utf8"),
);
const baseIndex = process.argv.indexOf("--base");
const base = baseIndex === -1 ? undefined : process.argv[baseIndex + 1];

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function normalize(value) {
  return value.replace(/^\.\//, "").replace(/\/+$/, "");
}

function overlaps(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function protectedRoots() {
  return [
    ...(facts.governance?.coreRoots ?? []),
    ...(facts.governance?.platformModuleRoots ?? []),
  ].map(normalize);
}

async function loadModifications(errors) {
  const files = await readdir(modificationsDirectory).catch(() => []);
  const modifications = [];
  for (const file of files.filter((file) => /^MOD-\d{4}\.json$/.test(file)).sort()) {
    const modification = JSON.parse(await readFile(path.join(modificationsDirectory, file), "utf8"));
    modification.file = file;
    modifications.push(modification);
  }
  if (files.length > 0 && modifications.length !== files.length) {
    errors.push("Modification files must be named MOD-0001.json (four digits).");
  }
  return modifications;
}

function validateModification(modification, errors) {
  const required = ["id", "classification", "status", "paths", "owner", "reason", "evidence", "impact"];
  for (const field of required) if (!modification[field]) errors.push(`${modification.file}: missing ${field}.`);
  if (modification.id !== modification.file.replace(".json", "")) {
    errors.push(`${modification.file}: id must match the filename.`);
  }
  if (!new Set(["upstream-candidate", "product-specific", "temporary-workaround"]).has(modification.classification)) {
    errors.push(`${modification.file}: invalid classification.`);
  }
  if (!new Set(["active", "resolved"]).has(modification.status)) {
    errors.push(`${modification.file}: invalid status.`);
  }
  if (!Array.isArray(modification.paths) || modification.paths.length === 0) {
    errors.push(`${modification.file}: paths must be a non-empty array.`);
  }
  if (!Array.isArray(modification.evidence?.tests) || modification.evidence.tests.length === 0) {
    errors.push(`${modification.file}: evidence.tests must contain a command or test reference.`);
  }
  for (const key of ["security", "data", "compatibility"]) {
    if (!new Set(["none", "low", "medium", "high"]).has(modification.impact?.[key])) {
      errors.push(`${modification.file}: impact.${key} must be none, low, medium, or high.`);
    }
  }
  if (modification.classification === "upstream-candidate" && !modification.upstream?.reference) {
    errors.push(`${modification.file}: upstream-candidate requires upstream.reference.`);
  }
  if (modification.classification === "temporary-workaround") {
    if (!modification.review?.deadline || !modification.review?.removalCondition) {
      errors.push(`${modification.file}: temporary-workaround requires review deadline and removalCondition.`);
    } else if (new Date(`${modification.review.deadline}T00:00:00Z`) < new Date()) {
      errors.push(`${modification.file}: temporary-workaround review deadline has passed.`);
    }
  }
}

async function main() {
  await access(sourcePath).catch(() => undefined);
  const sourceExists = await access(sourcePath).then(() => true).catch(() => false);
  if (!sourceExists) {
    console.log("No .template/source.json: upstream template check skipped.");
    return;
  }

  const errors = [];
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  if (!source.upstream?.commit) errors.push(".template/source.json must include upstream.commit.");
  if (source.upstream?.commit) {
    try {
      git("merge-base", "--is-ancestor", source.upstream.commit, "HEAD");
    } catch {
      errors.push("upstream.commit must be an ancestor of HEAD.");
    }
  }

  const modifications = await loadModifications(errors);
  const seenPaths = [];
  for (const modification of modifications) {
    validateModification(modification, errors);
    for (const rawPath of modification.paths ?? []) {
      const currentPath = normalize(rawPath);
      if (!protectedRoots().some((rootPath) => overlaps(currentPath, rootPath))) {
        errors.push(`${modification.file}: ${currentPath} is not a protected Core or Platform path.`);
      }
      for (const previous of seenPaths) {
        if (overlaps(currentPath, previous.path)) {
          errors.push(`${modification.file}: ${currentPath} overlaps ${previous.file}: ${previous.path}.`);
        }
      }
      seenPaths.push({ file: modification.file, path: currentPath });
    }
  }

  const comparison = base ?? source.upstream?.commit;
  if (!comparison) errors.push("No comparison commit available.");
  let changedFiles = [];
  if (comparison) {
    try {
      changedFiles = git("diff", "--name-only", `${comparison}...HEAD`).split("\n").filter(Boolean);
    } catch {
      errors.push(`Cannot diff against ${comparison}.`);
    }
  }
  for (const file of changedFiles.filter((file) => protectedRoots().some((rootPath) => overlaps(file, rootPath)))) {
    const matches = modifications.filter((modification) =>
      modification.status === "active" && modification.paths?.some((modifiedPath) => overlaps(file, normalize(modifiedPath))),
    );
    if (matches.length !== 1) errors.push(`${file}: requires exactly one active Modification Manifest record.`);
  }

  if (errors.length > 0) throw new Error(`Modification Manifest check failed:\n${errors.join("\n")}`);
  console.log(`Modification Manifest check passed (${changedFiles.length} changed files).`);
}

await main();
