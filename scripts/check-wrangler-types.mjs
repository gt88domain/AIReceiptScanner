import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const server = resolve(root, "apps/server");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "easystarter-wrangler-types-"));
const serverPackage = JSON.parse(await readFile(resolve(server, "package.json"), "utf8"));
const webPackage = JSON.parse(await readFile(resolve(root, "apps/web/package.json"), "utf8"));

for (const [workspace, command] of [
  ["server", serverPackage.scripts["cf-typegen:preview"]],
  ["web", webPackage.scripts["cf-typegen:preview"]],
]) {
  assert.match(command, /wrangler\.preview\.jsonc/u, `${workspace} preview typegen needs its config`);
  assert.match(command, /\.wrangler\/types\//u, `${workspace} preview types must stay isolated`);
  assert.match(command, /--strict-vars=false/u, `${workspace} preview vars must not become literals`);
}

async function typesFor(name, config) {
  const output = join(temporaryDirectory, `${name}.d.ts`);
  await execFileAsync(
    "pnpm",
    ["--filter", "server", "exec", "wrangler", "types", output, "--config", config, "--include-runtime=false"],
    { cwd: server },
  );
  return readFile(output, "utf8");
}

await execFileAsync(
  "pnpm",
  ["--filter", "server", "exec", "wrangler", "types", "worker-configuration.d.ts", "--check"],
  { cwd: server },
);

const [fullSaas, directoryLite, noStorage, emailDisabled] = await Promise.all([
  typesFor("full-saas", "../../template-kit/profiles/full-saas/wrangler.server.example.jsonc"),
  typesFor("directory-lite", "../../template-kit/profiles/directory-lite/wrangler.server.example.jsonc"),
  typesFor("no-storage", "../../template-kit/fixtures/wrangler/no-storage.server.jsonc"),
  typesFor("email-disabled", "../../template-kit/fixtures/wrangler/email-disabled.server.jsonc"),
]);

assert.match(fullSaas, /STORAGE: R2Bucket/);
assert.match(fullSaas, /JOB_QUEUE: Queue/);
for (const text of [directoryLite, noStorage, emailDisabled]) {
  assert.doesNotMatch(text, /STORAGE: R2Bucket/);
}
for (const text of [directoryLite, emailDisabled]) {
  assert.doesNotMatch(text, /JOB_QUEUE: Queue/);
}
assert.doesNotMatch(emailDisabled, /RESEND_API_KEY/);
console.log("Wrangler-generated binding types are current and profile fixtures are isolated.");
