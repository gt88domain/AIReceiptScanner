import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: "test-only-7c8e03a19df24b56a0c4e9b2f6d18a73c5e0b94d2f7a61e83c4b9d05a2f18e76",
          RESEND_API_KEY: "test-resend-key",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.integration.test.ts"],
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
