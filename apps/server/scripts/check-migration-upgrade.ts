import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";

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
