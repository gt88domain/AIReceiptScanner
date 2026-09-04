import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const forbiddenTokens = [
  { code: "DEMO_IDENTITY_PRESENT", token: "TanStack Template" },
  { code: "DEMO_IDENTITY_PRESENT", token: "tanstack-template" },
  { code: "DEMO_DOMAIN_PRESENT", token: "demo.aiarticles.com" },
  { code: "DEMO_SUPPORT_EMAIL_PRESENT", token: "support@demo.aiarticles.com" },
  { code: "PLACEHOLDER_RESOURCE_PRESENT", token: "replace-domain.example" },
  { code: "PLACEHOLDER_RESOURCE_PRESENT", token: "api.replace-domain.example" },
  { code: "PLACEHOLDER_RESOURCE_PRESENT", token: "00000000-0000-0000-0000-000000000000" },
];

const sourceArtifacts = [
  "packages/app-config/src/public-runtime.ts",
  "packages/app-config/src/product-config.ts",
  "packages/i18n/src/messages/web/en.json",
  "packages/i18n-dormant-catalogs/messages/web/zh.json",
  "packages/i18n-dormant-catalogs/messages/web/jp.json",
  "apps/server/src/app/register-core-routes.ts",
  "apps/web/wrangler.jsonc",
  "apps/server/wrangler.jsonc",
];

export function findProductionIdentityIssues(text, artifact) {
  return forbiddenTokens
    .filter(({ token }) => text.includes(token))
    .map(({ code, token }) => ({
      artifact,
      code,
      message: `[${code}] ${artifact} contains '${token}'. Replace the template identity before production.`,
      token,
    }));
}

async function filesRecursively(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

async function scanArtifacts(artifacts) {
  const findings = [];
  for (const artifact of artifacts) {
    const text = await readFile(join(root, artifact), "utf8");
    findings.push(...findProductionIdentityIssues(text, artifact));
  }
  return findings;
}

async function scanBuildArtifacts() {
  const findings = [];
  for (const directory of ["apps/web/dist/client", "apps/server/dist"]) {
    const files = await filesRecursively(join(root, directory)).catch(() => []);
    for (const path of files) {
      const artifact = path.slice(root.length + 1);
      findings.push(...findProductionIdentityIssues(await readFile(path, "utf8"), artifact));
    }
  }
  return findings;
}

async function selfCheck() {
  const demo = findProductionIdentityIssues(
    "TanStack Template support@demo.aiarticles.com replace-domain.example",
    "fixture",
  );
  assert.deepEqual(
    demo.map(({ code }) => code),
    [
      "DEMO_IDENTITY_PRESENT",
      "DEMO_DOMAIN_PRESENT",
      "DEMO_SUPPORT_EMAIL_PRESENT",
      "PLACEHOLDER_RESOURCE_PRESENT",
    ],
  );
  assert.deepEqual(findProductionIdentityIssues("Acme Cloud", "fixture"), []);
  // Docs and template-kit are intentionally not passed to this focused artifact scanner.
  assert.deepEqual(findProductionIdentityIssues("Example only", "docs/example.md"), []);
  console.log("Production identity scanner self-check passed.");
}

async function main() {
  if (process.argv.includes("--self-check")) return selfCheck();
  const findings = await scanArtifacts(sourceArtifacts);
  if (process.argv.includes("--include-build")) findings.push(...(await scanBuildArtifacts()));
  if (findings.length > 0) throw new Error(findings.map(({ message }) => message).join("\n"));
  console.log("Production identity scanner passed.");
}

await main();
