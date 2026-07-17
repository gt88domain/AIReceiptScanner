import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, inject } from "vitest";

type D1Migration = { name: string; queries: string[] };

declare module "vitest" {
  export interface ProvidedContext {
    d1Migrations: D1Migration[];
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, inject("d1Migrations"));
});
