import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

type AccountAuditClient = Pick<Client, "execute">;

export type AccountIdentityCollision = {
  accountIdHash: string;
  ownerCount: number;
  providerId: string;
  recordCount: number;
};

export type RepeatedProviderAccount = {
  providerId: string;
  recordCount: number;
  userIdHash: string;
};

function hashIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Read-only audit for legacy Better Auth account rows. It deliberately never
 * selects credentials or emits raw account/user identifiers.
 */
export async function auditAuthAccounts(client: AccountAuditClient) {
  const [identityRows, repeatedRows] = await Promise.all([
    client.execute(`
      SELECT provider_id, account_id, COUNT(*) AS record_count, COUNT(DISTINCT user_id) AS owner_count
      FROM account
      GROUP BY provider_id, account_id
      HAVING COUNT(*) > 1
      ORDER BY provider_id, account_id
    `),
    client.execute(`
      SELECT provider_id, user_id, COUNT(*) AS record_count
      FROM account
      GROUP BY provider_id, user_id
      HAVING COUNT(*) > 1
      ORDER BY provider_id, user_id
    `),
  ]);

  return {
    identityCollisions: identityRows.rows.map((row) => ({
      accountIdHash: hashIdentity(String(row.account_id)),
      ownerCount: Number(row.owner_count),
      providerId: String(row.provider_id),
      recordCount: Number(row.record_count),
    })) satisfies AccountIdentityCollision[],
    repeatedProviderAccounts: repeatedRows.rows.map((row) => ({
      providerId: String(row.provider_id),
      recordCount: Number(row.record_count),
      userIdHash: hashIdentity(String(row.user_id)),
    })) satisfies RepeatedProviderAccount[],
  };
}

function databaseUrl(argument: string | undefined) {
  if (!argument) {
    throw new Error(
      "[AUTH_ACCOUNT_AUDIT_DATABASE_REQUIRED] Usage: pnpm --filter server audit:auth-accounts -- <local-sqlite-path>",
    );
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(argument) && !argument.startsWith("file:")) {
    throw new Error(
      "[AUTH_ACCOUNT_AUDIT_LOCAL_ONLY] The account audit only accepts a local SQLite path.",
    );
  }
  return argument.startsWith("file:") ? argument : pathToFileURL(resolve(argument)).href;
}

async function main() {
  const argument = process.argv.slice(2).find((value) => value !== "--");
  const database = createClient({ url: databaseUrl(argument) });
  try {
    const report = await auditAuthAccounts(database).catch((error) => {
      if (error instanceof Error && /no such table: account/i.test(error.message)) {
        throw new Error(
          "[AUTH_ACCOUNT_SCHEMA_MISMATCH] The local database does not contain the Better Auth account table.",
        );
      }
      throw error;
    });
    for (const duplicate of report.identityCollisions) {
      console.error(
        `[AUTH_ACCOUNT_DUPLICATES_FOUND] provider=${duplicate.providerId} accountHash=${duplicate.accountIdHash} records=${duplicate.recordCount} owners=${duplicate.ownerCount}`,
      );
    }
    for (const repeated of report.repeatedProviderAccounts) {
      console.warn(
        `[AUTH_ACCOUNT_REPEATED_PROVIDER] provider=${repeated.providerId} userHash=${repeated.userIdHash} records=${repeated.recordCount}`,
      );
    }
    if (report.identityCollisions.length > 0) process.exitCode = 1;
    else console.log("Better Auth account audit passed: no duplicate provider identities.");
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
