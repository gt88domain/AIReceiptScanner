import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { auditLegacyCreditRecoveries } from "../src/credits/application/legacy-recovery-audit";
import type { Database } from "../src/db";
import * as schema from "../src/db/schema";

const migrationKey = "v5_legacy_credit_recovery_audit";

function databasePath(argument: string | undefined) {
  if (!argument) {
    throw new Error(
      "[LEGACY_CREDIT_RECOVERY_DATABASE_REQUIRED] Usage: pnpm --filter server audit:legacy-credit-recoveries -- <local-sqlite-path>",
    );
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(argument) && !argument.startsWith("file:")) {
    throw new Error(
      "[LEGACY_CREDIT_RECOVERY_LOCAL_ONLY] Audit an exported production SQLite snapshot, then retain its migration receipt with the release evidence.",
    );
  }
  return argument.startsWith("file:") ? new URL(argument) : pathToFileURL(resolve(argument));
}

async function main() {
  const argument = process.argv.slice(2).find((value) => value !== "--");
  const path = databasePath(argument);
  const client = createClient({ url: path.href });
  try {
    const db = drizzle(client, { schema });
    const report = await auditLegacyCreditRecoveries(db as unknown as Database);
    const completedAt = new Date().toISOString();
    const receipt = { migrationKey, completedAt, ...report };
    const receiptPath = `${fileURLToPath(path)}.v5-legacy-credit-recovery-audit.json`;
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ...receipt, receiptPath }));
  } finally {
    client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
