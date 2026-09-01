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

const turbo = await readJson("turbo.json");
assert.ok(
  turbo.tasks?.dev?.passThroughEnv?.includes("TANSTACK_DEVTOOLS_BUS_PORT"),
  "Turbo dev must pass TANSTACK_DEVTOOLS_BUS_PORT to the Web dev process.",
);

console.log("Core and optional development configuration are isolated.");
