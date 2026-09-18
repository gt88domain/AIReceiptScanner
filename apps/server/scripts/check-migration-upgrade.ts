import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";
import { auditAuthAccounts } from "./audit-auth-accounts";

const migrationsDir = new URL("../src/db/migrations/", import.meta.url);

function statements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

test("upgrades a 0019 database through 0020 with its partial scope index", async () => {
  const directory = await mkdtemp(join(tmpdir(), "easystarter-migration-"));
  const database = createClient({ url: `file:${join(directory, "upgrade.sqlite")}` });
  try {
    const files = (await readdir(migrationsDir))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort();
    const previous = files.filter((file) => file <= "0019_fast_shard.sql");
    for (const file of previous) {
      const sql = await readFile(new URL(file, migrationsDir), "utf8");
      for (const statement of statements(sql)) await database.execute(statement);
    }
    for (const statement of statements(
      await readFile(new URL("0020_cultured_tattoo.sql", migrationsDir), "utf8"),
    ))
      await database.execute(statement);

    const index = await database.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
      args: ["payment_operation_active_scope_idx"],
    });
    assert.match(
      String(index.rows[0]?.sql),
      /WHERE `scope_key` IS NOT NULL AND `status` IN \('pending','processing','provider_succeeded'\)/,
    );
    const columns = await database.execute("PRAGMA table_info(payment_operation)");
    assert(columns.rows.some((column) => column.name === "retryable"));
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("preserves v0.4.9 Auth records through later product migrations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "easystarter-auth-upgrade-"));
  const database = createClient({ url: `file:${join(directory, "upgrade.sqlite")}` });
  try {
    const files = (await readdir(migrationsDir))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort();
    const v049Migrations = files.filter((file) => file <= "0020_cultured_tattoo.sql");
    for (const file of v049Migrations) {
      const sql = await readFile(new URL(file, migrationsDir), "utf8");
      for (const statement of statements(sql)) await database.execute(statement);
    }

    const now = Date.now();
    await database.batch([
      {
        sql: "INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["v049-user", "v0.4.9 User", "v049@example.test", 1, null, now, now, null],
      },
      {
        sql: "INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["another-user", "Another User", "another@example.test", 1, null, now, now, null],
      },
      {
        sql: "INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["v049-google", "google-subject", "google", "v049-user", now, now],
      },
      {
        sql: "INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["v049-credential-a", "credential-a", "credential", "v049-user", now, now],
      },
      {
        sql: "INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["v049-credential-b", "credential-b", "credential", "v049-user", now, now],
      },
      {
        sql: "INSERT INTO session (id, expires_at, token, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["v049-session", now + 86_400_000, "v049-token", now, now, "v049-user"],
      },
      {
        sql: 'INSERT INTO "rateLimit" (id, key, count, lastRequest) VALUES (?, ?, ?, ?)',
        args: ["v049-rate-limit", "sign-in:v049-user", 1, now],
      },
    ]);

    for (const file of files.filter((file) => file > "0020_cultured_tattoo.sql")) {
      const sql = await readFile(new URL(file, migrationsDir), "utf8");
      for (const statement of statements(sql)) await database.execute(statement);
    }

    const user = await database.execute({
      sql: "SELECT email, deleted_at FROM user WHERE id = ?",
      args: ["v049-user"],
    });
    const session = await database.execute({
      sql: "SELECT user_id FROM session WHERE token = ?",
      args: ["v049-token"],
    });
    const account = await database.execute({
      sql: "SELECT provider_id, account_id FROM account WHERE user_id = ?",
      args: ["v049-user"],
    });
    const rateLimit = await database.execute({
      sql: 'SELECT count FROM "rateLimit" WHERE key = ?',
      args: ["sign-in:v049-user"],
    });
    assert.equal(user.rows[0]?.email, "v049@example.test");
    assert.equal(user.rows[0]?.deleted_at, null);
    assert.equal(session.rows[0]?.user_id, "v049-user");
    assert.deepEqual(account.rows[0], { account_id: "google-subject", provider_id: "google" });
    assert.equal(rateLimit.rows[0]?.count, 1);

    await database.execute({
      sql: "INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["v049-google-duplicate", "google-subject", "google", "another-user", now, now],
    });
    const audit = await auditAuthAccounts(database);
    assert.deepEqual(audit.identityCollisions, [
      {
        accountIdHash: "e22da985529bfd08",
        ownerCount: 2,
        providerId: "google",
        recordCount: 2,
      },
    ]);
    assert.deepEqual(audit.repeatedProviderAccounts, [
      {
        providerId: "credential",
        recordCount: 2,
        userIdHash: "b587e467669004a4",
      },
    ]);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
