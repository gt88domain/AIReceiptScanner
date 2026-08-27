import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const serverBundle = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");

assert.match(
  serverBundle,
  /Content-Security-Policy/,
  "Web server bundle is missing the custom security-header entrypoint",
);
assert.match(
  serverBundle,
  /X-Robots-Tag/,
  "Web server bundle is missing private-route noindex handling",
);

console.log("Built Web server entry check passed.");
