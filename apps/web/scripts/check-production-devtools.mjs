import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const webRoot = resolve(import.meta.dirname, "..");
const rootRoute = await readFile(resolve(webRoot, "src/routes/__root.tsx"), "utf8");

assert.doesNotMatch(rootRoute, /from ["']@tanstack\/react-(?:query-|router-)?devtools["']/);
assert.match(
  rootRoute,
  /import\.meta\.env\.DEV[\s\S]*import\(["']@\/components\/development-devtools["']\)/,
);

const assets = await readdir(resolve(webRoot, "dist/client/assets"));
assert.equal(
  assets.some((name) => name.startsWith("development-devtools-")),
  false,
  "Production client assets include the development-only Devtools chunk.",
);

console.log("Production Web source and assets exclude the development-only Devtools entry.");
