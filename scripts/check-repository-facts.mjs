import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const facts = JSON.parse(await readFile(path.join(root, "template-kit/repository-facts.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const workspace = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
const serverWrangler = await readFile(path.join(root, "apps/server/wrangler.jsonc"), "utf8");
const webWrangler = await readFile(path.join(root, "apps/web/wrangler.jsonc"), "utf8");
const qualityWorkflow = await readFile(path.join(root, ".github/workflows/quality.yml"), "utf8");
const errors = [];

if (packageJson.packageManager !== facts.packageManager) {
  errors.push(`packageManager must be ${facts.packageManager}.`);
}

for (const workspacePattern of facts.workspacePatterns) {
  if (!workspace.includes(`- ${workspacePattern}`)) {
    errors.push(`pnpm workspace is missing ${workspacePattern}.`);
  }
}

for (const [name, directory] of Object.entries(facts.applications)) {
  if (typeof directory !== "string") continue;
  await access(path.join(root, directory)).catch(() => errors.push(`Missing application directory: ${name} (${directory}).`));
}

for (const script of facts.requiredRootScripts) {
  if (!packageJson.scripts?.[script]) errors.push(`Root package.json is missing script: ${script}.`);
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

for (const guidanceFile of facts.guidanceFiles) {
  const guidance = await readFile(path.join(root, guidanceFile), "utf8");
  for (const required of facts.requiredGuidance) {
    if (!guidance.includes(required)) errors.push(`${guidanceFile} must mention ${required}.`);
  }
  if (guidance.includes("There is no root `test` script")) {
    errors.push(`${guidanceFile} incorrectly says the root test script does not exist.`);
  }
}

if (errors.length > 0) throw new Error(`Repository fact drift:\n${errors.join("\n")}`);

console.log("Repository fact check passed.");
