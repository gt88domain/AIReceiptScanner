import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load production Cloudflare credentials for remote D1 migrations.
config({ path: ".env.production" });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

const isSchemaOnlyCommand = process.argv.includes("generate") || process.argv.includes("check");

if (!(accountId && token && databaseId) && !isSchemaOnlyCommand) {
  throw new Error(
    "Missing required environment variables: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_D1_DATABASE_ID",
  );
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: accountId ?? "schema-generation-does-not-connect",
    databaseId: databaseId ?? "schema-generation-does-not-connect",
    token: token ?? "schema-generation-does-not-connect",
  },
});
