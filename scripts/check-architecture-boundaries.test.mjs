import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(root, "scripts/check-architecture-boundaries.mjs");
const facts = {
  governance: {
    boundaryRules: [
      { id: "web-no-db", directories: ["apps/web/src"], forbiddenImportPatterns: ["drizzle-orm"] },
      {
        id: "product-no-sdk",
        directories: ["apps/server/src/modules"],
        forbiddenImportPatterns: ["better-auth|cloudflare:workers"],
      },
      {
        id: "core-no-product",
        directories: ["apps/server/src/lib"],
        forbiddenImportPatterns: ["@/modules/(?!jobs(?:/|[\\\"'])|assets(?:/|[\\\"'])|audit(?:/|[\\\"']))"],
      },
    ],
  },
};

async function run(files) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "template-boundaries-"));
  try {
    await mkdir(path.join(directory, "template-kit"), { recursive: true });
    await writeFile(path.join(directory, "template-kit/repository-facts.json"), JSON.stringify(facts));
    for (const [file, content] of Object.entries(files)) {
      const target = path.join(directory, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    return { output: execFileSync("node", [checker], { cwd: directory, encoding: "utf8", stdio: "pipe" }) };
  } catch (error) {
    return { error: String(error.stderr) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("allows product modules using standard application contracts", async () => {
  const result = await run({
    "apps/server/src/modules/catalog/service.ts": 'import { requireCapability } from "@/auth/guards";\n',
  });
  assert.match(result.output, /passed/);
});

test("rejects database, provider, and core-to-product imports", async () => {
  assert.match(
    (await run({ "apps/web/src/catalog.ts": 'import { db } from "drizzle-orm";\n' })).error,
    /web-no-db/,
  );
  assert.match(
    (await run({ "apps/server/src/modules/catalog/service.ts": 'import "cloudflare:workers";\n' })).error,
    /product-no-sdk/,
  );
  assert.match(
    (await run({ "apps/server/src/lib/core.ts": 'import "@/modules/catalog/service";\n' })).error,
    /core-no-product/,
  );
});
