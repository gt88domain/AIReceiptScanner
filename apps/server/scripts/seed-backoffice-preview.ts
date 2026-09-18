import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { hashPassword } from "../src/lib/password";

const previewRoot = "/.wrangler/backoffice-preview/";
const localDbPath = process.env.LOCAL_D1_DB_PATH;
const password = process.env.BACKOFFICE_PREVIEW_PASSWORD;

if (process.env.BACKOFFICE_PREVIEW !== "1") {
  throw new Error("BACKOFFICE_PREVIEW=1 is required to seed Backoffice preview.");
}
if (!localDbPath || !resolve(localDbPath).replaceAll("\\", "/").includes(previewRoot)) {
  throw new Error("Backoffice preview seed requires its dedicated local D1 path.");
}
if (!password) {
  throw new Error("BACKOFFICE_PREVIEW_PASSWORD is required to seed Backoffice preview.");
}

const accounts = [
  {
    id: "backoffice-preview-user",
    accountId: "backoffice-preview-user-account",
    email: "user-preview@local.test",
    name: "Preview user",
  },
  {
    id: "backoffice-preview-admin",
    accountId: "backoffice-preview-admin-account",
    email: "admin-preview@local.test",
    name: "Preview admin",
  },
] as const;

const client = createClient({ url: `file:${resolve(localDbPath)}` });
const now = Math.floor(Date.now() / 1000);
const passwordHash = await hashPassword(password);

for (const previewAccount of accounts) {
  await client.execute({
    sql: `INSERT INTO user (id, name, email, email_verified, phone_number_verified, created_at, updated_at)
          VALUES (?, ?, ?, 1, 0, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            email_verified = excluded.email_verified,
            phone_number_verified = excluded.phone_number_verified,
            updated_at = excluded.updated_at`,
    args: [previewAccount.id, previewAccount.name, previewAccount.email, now, now],
  });
  await client.execute({ sql: "DELETE FROM session WHERE user_id = ?", args: [previewAccount.id] });
  await client.execute({
    sql: `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
          VALUES (?, ?, 'credential', ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            account_id = excluded.account_id,
            provider_id = excluded.provider_id,
            user_id = excluded.user_id,
            password = excluded.password,
            updated_at = excluded.updated_at`,
    args: [previewAccount.accountId, previewAccount.id, previewAccount.id, passwordHash, now, now],
  });
}

await client.close();
