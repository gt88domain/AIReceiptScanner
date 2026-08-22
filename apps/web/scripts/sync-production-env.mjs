import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseJsonc } from "jsonc-parser";

/**
 * Generates apps/web/.env.production from the VITE_* vars in wrangler.jsonc so
 * a deploy machine never needs a hand-maintained copy. wrangler.jsonc is the
 * single source of truth for public build URLs; a pre-existing file that
 * disagrees fails loudly instead of silently drifting.
 */

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(webDir, ".env.production");

function parseEnvText(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

export function renderProductionEnv(vars, existing = {}) {
  const viteVars = Object.fromEntries(
    Object.entries(vars).filter(([key]) => key.startsWith("VITE_")),
  );
  const conflicts = Object.entries(existing).filter(
    ([key, value]) => key in viteVars && viteVars[key] !== value,
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Existing .env.production disagrees with web wrangler.jsonc vars:\n` +
        conflicts.map(([key]) => `- ${key}`).join("\n") +
        `\nFix the file or delete it; wrangler.jsonc wins.`,
    );
  }
  const lines = Object.entries(viteVars).map(([key, value]) => `${key}=${value}`);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

async function main() {
  const jsoncErrors = [];
  const config = parseJsonc(await readFile(resolve(webDir, "wrangler.jsonc"), "utf8"), jsoncErrors);
  if (jsoncErrors.length > 0) throw new Error("web wrangler.jsonc contains invalid JSONC.");
  const vars = config?.vars ?? {};
  let existing = {};
  try {
    existing = parseEnvText(await readFile(envPath, "utf8"));
  } catch {
    // No pre-existing file; generate from scratch.
  }
  await writeFile(envPath, renderProductionEnv(vars, existing));
  console.log("Synced apps/web/.env.production from web wrangler.jsonc vars.");
}

function selfCheck() {
  const vars = { VITE_APP_URL: "https://app.acme.test", NODE_ENV: "production" };
  const rendered = renderProductionEnv(vars);
  if (rendered !== "VITE_APP_URL=https://app.acme.test\n") {
    throw new Error(`unexpected render: ${JSON.stringify(rendered)}`);
  }
  renderProductionEnv(vars, { VITE_APP_URL: "https://app.acme.test" });
  let threw = false;
  try {
    renderProductionEnv(vars, { VITE_APP_URL: "https://other.example" });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected drift conflict to throw");
  console.log("sync-production-env self-check passed.");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  await main();
}
