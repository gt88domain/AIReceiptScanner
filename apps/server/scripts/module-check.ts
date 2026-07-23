import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { productFeatures, validateServerModuleEnvironment } from "../src/lib/module-config";

const envFile = process.argv[2];

if (envFile) {
  const resolvedEnvFile = resolve(envFile);
  if (!existsSync(resolvedEnvFile)) {
    throw new Error(`[module:check] Environment file not found: ${resolvedEnvFile}`);
  }
  process.loadEnvFile(resolvedEnvFile);
}

validateServerModuleEnvironment(process.env);

for (const [name, enabled] of Object.entries({
  admin: productFeatures.admin,
  billing: productFeatures.billing,
  credits: productFeatures.credits,
  storage: productFeatures.storage,
  jobs: productFeatures.jobs,
})) {
  console.info(`${enabled ? "✓" : "○"} ${name} ${enabled ? "enabled" : "disabled"}`);
}

console.info("✓ enabled module secrets validated");
console.info(
  "○ Worker bindings and applied D1 migrations are verified by Wrangler during deployment",
);
