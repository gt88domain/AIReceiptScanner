import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

/**
 * Rotation/write path: pushes `apps/server/.env.production` to the Worker via
 * `wrangler secret bulk`, after filtering out values that must not become
 * Worker secrets:
 * - empty values (placeholder optional keys would otherwise be pushed as
 *   present-but-empty secrets and trip the preflight's undeclared warnings);
 * - ENVIRONMENT, a preflight-only marker (the runtime reads NODE_ENV from
 *   wrangler.jsonc vars); pushing it would create an undeclared live secret.
 */

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const NON_SECRET_KEYS = new Set(["ENVIRONMENT"]);

export function selectSecretsToPush(env) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) => !NON_SECRET_KEYS.has(key) && value.trim().length > 0,
    ),
  );
}

async function main() {
  const env = parseEnv(await readFile(resolve(serverDir, ".env.production")));
  const secrets = selectSecretsToPush(env);
  const skipped = Object.keys(env).filter((key) => !(key in secrets));
  if (Object.keys(secrets).length === 0) {
    throw new Error("No secrets to push: .env.production only has empty or non-secret keys.");
  }
  if (skipped.length > 0) {
    console.warn(`Skipping non-secret/empty keys: ${skipped.join(", ")}`);
  }
  const child = spawn("pnpm", ["exec", "wrangler", "secret", "bulk"], {
    cwd: serverDir,
    stdio: ["pipe", "inherit", "inherit"],
  });
  child.stdin.end(JSON.stringify(secrets));
  const code = await new Promise((resolvePromise) => child.on("close", resolvePromise));
  if (code !== 0) throw new Error(`wrangler secret bulk exited with code ${code}.`);
}

function selfCheck() {
  const selected = selectSecretsToPush({
    ENVIRONMENT: "production",
    BETTER_AUTH_SECRET: "a".repeat(32),
    TURNSTILE_SECRET_KEY: "",
    STRIPE_SECRET_KEY: "sk_live_x",
  });
  assert.deepEqual(selected, {
    BETTER_AUTH_SECRET: "a".repeat(32),
    STRIPE_SECRET_KEY: "sk_live_x",
  });
  console.log("push-production-secrets self-check passed.");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  await main();
}
