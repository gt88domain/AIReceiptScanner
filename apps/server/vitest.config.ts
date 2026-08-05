import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const migrationsDir = fileURLToPath(new URL("./src/db/migrations", import.meta.url));
const d1Migrations = await Promise.all(
  (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map(async (name) => ({
      name,
      queries: (await readFile(`${migrationsDir}/${name}`, "utf8"))
        .split("--> statement-breakpoint")
        .map((query) => query.trim())
        .filter(Boolean),
    })),
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          ADMIN_EMAILS: "admin@example.test",
          BETTER_AUTH_SECRET:
            "test-only-7c8e03a19df24b56a0c4e9b2f6d18a73c5e0b94d2f7a61e83c4b9d05a2f18e76",
          CONTACT_RECIPIENT: "support@example.test",
          EMAIL_FROM: "noreply@example.test",
          REVENUECAT_WEBHOOK_SECRET: "test-revenuecat-webhook-secret",
          RESEND_API_KEY: "test-resend-key",
          STRIPE_SECRET_KEY: "sk_test_module_check",
          STRIPE_WEBHOOK_SECRET: "whsec_module_check",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.integration.test.ts"],
    provide: { d1Migrations },
    setupFiles: ["./test/setup.ts"],
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@repo/api-client": fileURLToPath(
        new URL("../../packages/api-client/src/index.ts", import.meta.url),
      ),
      resend: fileURLToPath(new URL("./test/stubs/resend.ts", import.meta.url)),
    },
  },
});
