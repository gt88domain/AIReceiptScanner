import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const facts = JSON.parse(
  await readFile(path.join(root, "template-kit/repository-facts.json"), "utf8"),
);
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const recommendedBaseline = JSON.parse(
  await readFile(path.join(root, "template-kit/recommended-baseline.json"), "utf8"),
);
const workspace = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
const serverWrangler = await readFile(path.join(root, "apps/server/wrangler.jsonc"), "utf8");
const webWrangler = await readFile(path.join(root, "apps/web/wrangler.jsonc"), "utf8");
const qualityWorkflow = await readFile(path.join(root, ".github/workflows/quality.yml"), "utf8");
const codeowners = await readFile(path.join(root, ".github/CODEOWNERS"), "utf8");
const errors = [];

if (packageJson.packageManager !== facts.packageManager) {
  errors.push(`packageManager must be ${facts.packageManager}.`);
}

if (!/^v\d+\.\d+\.\d+$/u.test(recommendedBaseline.upstream?.release ?? "")) {
  errors.push("Recommended baseline release must be a semantic release tag.");
}
if (!/^[0-9a-f]{40}$/u.test(recommendedBaseline.upstream?.commit ?? "")) {
  errors.push("Recommended baseline commit must be a full Git SHA.");
}

for (const workspacePattern of facts.workspacePatterns) {
  if (!workspace.includes(`- ${workspacePattern}`)) {
    errors.push(`pnpm workspace is missing ${workspacePattern}.`);
  }
}

for (const [name, directory] of Object.entries(facts.applications)) {
  if (typeof directory !== "string") continue;
  await access(path.join(root, directory)).catch(() =>
    errors.push(`Missing application directory: ${name} (${directory}).`),
  );
}

for (const script of facts.requiredRootScripts) {
  if (!packageJson.scripts?.[script])
    errors.push(`Root package.json is missing script: ${script}.`);
}

for (const script of facts.optionalRootScripts ?? []) {
  if (!packageJson.scripts?.[script])
    errors.push(`Root package.json is missing optional script: ${script}.`);
}

const applicationNames = Object.entries(facts.applications)
  .filter(([, directory]) => typeof directory === "string")
  .map(([name]) => name);
const defaultApplications = facts.applications.default ?? [];
const optionalApplications = facts.applications.optional ?? [];

for (const name of [...defaultApplications, ...optionalApplications]) {
  if (!applicationNames.includes(name)) errors.push(`Unknown application classification: ${name}.`);
}

const boundaryRules = facts.governance?.boundaryRules;
if (!Array.isArray(boundaryRules) || boundaryRules.length === 0) {
  errors.push("Governance must define at least one architecture boundary rule.");
} else {
  for (const rule of boundaryRules) {
    if (
      !rule.id ||
      !Array.isArray(rule.directories) ||
      !Array.isArray(rule.forbiddenImportPatterns)
    ) {
      errors.push("Each architecture boundary rule needs an id, directories, and import patterns.");
      continue;
    }
    for (const directory of rule.directories) {
      await access(path.join(root, directory)).catch(() =>
        errors.push(`Boundary rule ${rule.id} references a missing directory: ${directory}.`),
      );
    }
  }
}

const coreRoots = facts.governance?.coreRoots ?? [];
const platformRoots = facts.governance?.platformModuleRoots ?? [];
const productRoots = facts.governance?.productRoots ?? [];
const declaredOverlaps = facts.governance?.declaredOverlaps ?? [];
const overlaps = (left, right) =>
  left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
for (const [leftName, leftRoots, rightName, rightRoots] of [
  ["core", coreRoots, "platform", platformRoots],
  ["core", coreRoots, "product", productRoots],
]) {
  for (const left of leftRoots) {
    for (const right of rightRoots) {
      if (overlaps(left, right))
        errors.push(`${leftName} root ${left} overlaps ${rightName} root ${right}.`);
    }
  }
}
for (const platformRoot of platformRoots) {
  const declaration = declaredOverlaps.find(
    (overlap) => overlap.ownership === "platform" && overlap.children?.includes(platformRoot),
  );
  if (!declaration || !productRoots.some((productRoot) => overlaps(platformRoot, productRoot))) {
    errors.push(`Platform root ${platformRoot} needs a declared product-root override.`);
  }
  if (!codeowners.includes(`/${platformRoot}/ @gt88domain`)) {
    errors.push(`CODEOWNERS is missing the platform root ${platformRoot}.`);
  }
}

for (const name of optionalApplications) {
  if (defaultApplications.includes(name))
    errors.push(`${name} cannot be both default and optional.`);
  const directory = facts.applications[name];
  if (typeof directory === "string" && packageJson.workspaces?.includes(directory)) {
    errors.push(`${name} is optional but remains in the root workspace.`);
  }
}

if (!qualityWorkflow.includes(`branches: [${facts.defaultBranch}]`)) {
  errors.push(`Quality workflow must target the ${facts.defaultBranch} branch.`);
}

if (!serverWrangler.includes('binding": "DB"')) {
  errors.push("Server Wrangler configuration is missing the D1 DB binding.");
}

if (!webWrangler.includes(`binding": "${facts.runtime.webApiBinding}"`)) {
  errors.push(`Web Wrangler configuration is missing ${facts.runtime.webApiBinding}.`);
}

if (errors.length > 0) throw new Error(`Repository fact drift:\n${errors.join("\n")}`);

console.log("Repository fact check passed.");
