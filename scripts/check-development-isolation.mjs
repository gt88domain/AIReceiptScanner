import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

let rootTsconfig;
try {
  rootTsconfig = await readJson("tsconfig.json");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

assert.notEqual(
  rootTsconfig?.extends,
  "expo/tsconfig.base",
  "The core workspace must not inherit the optional Expo TypeScript config.",
);

const mobileTsconfig = await readJson("optional/mobile/tsconfig.json");
assert.equal(
  mobileTsconfig.extends,
  "expo/tsconfig.base",
  "The optional Mobile workspace must retain its own Expo TypeScript config.",
);

const mobilePackage = await readJson("optional/mobile/package.json");
assert.equal(
  typeof mobilePackage.dependencies?.clsx,
  "string",
  "The isolated Mobile workspace must declare its direct clsx import.",
);

const mobileAppConfig = await readFile(resolve(root, "optional/mobile/configs/app-config.ts"), "utf8");
assert.match(
  mobileAppConfig,
  /const secureStoragePrefix = commonConfig\.app\.nativeScheme;/u,
  "Mobile SecureStore keys must use the stable native scheme instead of the display name.",
);
assert.doesNotMatch(
  mobileAppConfig,
  /storagePrefix:\s*commonConfig\.app\.name/u,
  "A human-readable display name is not a valid SecureStore key prefix.",
);

const turbo = await readJson("turbo.json");
assert.ok(
  turbo.tasks?.dev?.passThroughEnv?.includes("TANSTACK_DEVTOOLS_BUS_PORT"),
  "Turbo dev must pass TANSTACK_DEVTOOLS_BUS_PORT to the Web dev process.",
);

console.log("Core and optional development configuration are isolated.");
