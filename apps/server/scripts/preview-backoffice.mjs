import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { parse } from "jsonc-parser";
import {
  assertBackofficePreviewSafety,
  BACKOFFICE_PREVIEW_D1_ID,
  BACKOFFICE_PREVIEW_WORKER,
} from "../../../scripts/backoffice-preview-safety.mjs";

const serverRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(serverRoot, "../..");
const configPath = resolve(serverRoot, "backoffice-preview/wrangler.jsonc");
const statePath = resolve(serverRoot, ".wrangler/backoffice-preview");
const webUrl = "http://localhost:3100";
const serverUrl = "http://localhost:3101";

if (process.env.BACKOFFICE_PREVIEW !== "1") {
  throw new Error(
    "Run this command through `pnpm preview:backoffice` (BACKOFFICE_PREVIEW=1 is required).",
  );
}

const config = parse(readFileSync(configPath, "utf8"));
assertBackofficePreviewSafety({
  backofficePreview: process.env.BACKOFFICE_PREVIEW,
  nodeEnv: config.vars?.NODE_ENV,
  workerName: config.name,
  d1DatabaseId: config.d1_databases?.[0]?.database_id,
  isLocal: true,
});

if (
  config.name !== BACKOFFICE_PREVIEW_WORKER ||
  config.d1_databases?.[0]?.database_id !== BACKOFFICE_PREVIEW_D1_ID
) {
  throw new Error("Backoffice preview configuration does not match its dedicated local identity.");
}

run(
  "pnpm",
  [
    "--filter",
    "server",
    "exec",
    "wrangler",
    "d1",
    "execute",
    "DB",
    "--config",
    "backoffice-preview/wrangler.jsonc",
    "--local",
    "--persist-to",
    ".wrangler/backoffice-preview",
    "--command",
    "select 1",
  ],
  serverRoot,
);

const localDbPath = findLocalD1Database(statePath);
const previewPassword = randomBytes(18).toString("base64url");
const previewEnv = {
  ...process.env,
  BACKOFFICE_PREVIEW: "1",
  BACKOFFICE_PREVIEW_TICKETS: "1",
  LOCAL_D1_DB_PATH: localDbPath,
  BACKOFFICE_PREVIEW_PASSWORD: previewPassword,
};

run(
  "pnpm",
  ["--filter", "server", "exec", "drizzle-kit", "migrate", "--config", "drizzle.local.config.ts"],
  serverRoot,
  previewEnv,
);
run(
  "pnpm",
  ["--filter", "server", "exec", "tsx", "scripts/seed-backoffice-preview.ts"],
  serverRoot,
  previewEnv,
);

printPreviewLinks(previewPassword);

const server = spawn(
  "pnpm",
  [
    "--filter",
    "server",
    "exec",
    "wrangler",
    "dev",
    "--config",
    "backoffice-preview/wrangler.jsonc",
    "--local",
    "--persist-to",
    ".wrangler/backoffice-preview",
    "--port",
    "3101",
  ],
  { cwd: serverRoot, env: previewEnv, stdio: "inherit" },
);
const web = spawn("pnpm", ["--filter", "web", "exec", "vite", "--port", "3100"], {
  cwd: repositoryRoot,
  env: {
    ...previewEnv,
    VITE_APP_URL: webUrl,
    VITE_SERVER_URL: serverUrl,
    VITE_WEBSITE_URL: webUrl,
  },
  stdio: "inherit",
});

for (const child of [server, web]) {
  child.on("exit", (code) => {
    if (code && !process.exitCode) process.exitCode = code;
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.kill(signal);
    web.kill(signal);
  });
}

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Backoffice preview setup failed: ${command} ${args.join(" ")}`);
  }
}

function findLocalD1Database(stateDirectory) {
  const databaseDirectory = resolve(stateDirectory, "v3/d1/miniflare-D1DatabaseObject");
  if (!existsSync(databaseDirectory)) {
    throw new Error("Backoffice preview local D1 was not created.");
  }
  const sqliteFile = readdirSync(databaseDirectory).find((entry) => entry.endsWith(".sqlite"));
  if (!sqliteFile) throw new Error("Backoffice preview local D1 sqlite file was not found.");
  return resolve(databaseDirectory, sqliteFile);
}

function printPreviewLinks(password) {
  const userPages = [
    "/dashboard",
    "/settings/profile",
    "/settings/security",
    "/settings/billing",
    "/credits/purchase",
    "/credits/transactions",
    "/tickets",
  ];
  const adminPages = [
    "/admin",
    "/admin/analytics",
    "/admin/users",
    "/admin/integrations",
    "/admin/audit",
    "/admin/system",
    "/admin/support",
  ];

  console.log("\nBackoffice preview is local only. Press Ctrl+C to stop.\n");
  console.log(
    `User:  user-preview@local.test\nAdmin: admin-preview@local.test\nPassword (this run only): ${password}\n`,
  );
  console.log("User acceptance pages:");
  for (const page of userPages) console.log(`  ${webUrl}${page}`);
  console.log("\nAdmin acceptance pages:");
  for (const page of adminPages) console.log(`  ${webUrl}${page}`);
  console.log("");
}
