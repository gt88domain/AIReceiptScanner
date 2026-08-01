import { access, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse as parseEnv } from "dotenv";
import { parse as parseJsonc } from "jsonc-parser";
import { resolveNativeCommonConfig, resolveWebCommonConfig } from "@repo/app-config";

type EnvValues = Record<string, string | undefined>;
type JsonObject = Record<string, unknown>;

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readRequiredEnv(path: string) {
  try {
    await access(path);
  } catch {
    throw new Error(
      `Missing ${path}. Copy the matching .example file and fill it before deploying.`,
    );
  }

  return parseEnv(await readFile(path));
}

function asObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} in wrangler.jsonc.`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label} in wrangler.jsonc.`);
  }
  return value.map((item) => asObject(item, label));
}

function required(values: EnvValues, name: string, errors: string[]) {
  const value = values[name]?.trim();
  if (!value) {
    errors.push(`Missing ${name} in .env.production.`);
  }
  return value;
}

function requireExpected(values: EnvValues, name: string, actual: string, errors: string[]) {
  const expected = values[name]?.trim();
  if (!expected) {
    errors.push(`Missing ${name} in .production-safety.env.`);
  } else if (expected !== actual) {
    errors.push(`${name} does not match wrangler.jsonc.`);
  }
}

function isProductionUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.hostname !== "localhost";
  } catch {
    return false;
  }
}

function configuredPaymentProviders() {
  const providers = new Set<string>();
  const web = resolveWebCommonConfig();
  const native = resolveNativeCommonConfig();

  if (web.payments.enabled) {
    providers.add(web.payments.provider);
    for (const plan of web.payments.plans) {
      for (const price of plan.prices ?? []) {
        if (price.status !== "archived") providers.add(price.provider);
      }
    }
  }

  if (web.credits.enabled) {
    for (const creditPackage of web.credits.packages) {
      if (creditPackage.status === "archived" || !creditPackage.web) continue;
      providers.add(creditPackage.web.provider);
    }
  }

  if (native.payments.enabled) providers.add(native.payments.provider);
  if (native.credits.enabled) {
    for (const creditPackage of native.credits.packages) {
      if (creditPackage.status === "archived") continue;
      for (const product of Object.values(creditPackage.native)) {
        if (product) providers.add(product.provider);
      }
    }
  }

  return providers;
}

function validateProviderSecrets(values: EnvValues, errors: string[]) {
  for (const provider of configuredPaymentProviders()) {
    switch (provider) {
      case "stripe": {
        const key = required(values, "STRIPE_SECRET_KEY", errors);
        if (key && !key.startsWith("sk_live_")) {
          errors.push("STRIPE_SECRET_KEY must be a live key for production.");
        }
        const webhookSecret = required(values, "STRIPE_WEBHOOK_SECRET", errors);
        if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
          errors.push("STRIPE_WEBHOOK_SECRET must start with whsec_.");
        }
        break;
      }
      case "creem": {
        const key = required(values, "CREEM_API_KEY", errors);
        if (key && !key.startsWith("creem_live_")) {
          errors.push("CREEM_API_KEY must be a live key for production.");
        }
        required(values, "CREEM_WEBHOOK_SECRET", errors);
        break;
      }
      case "waffo":
        required(values, "WAFFO_MERCHANT_ID", errors);
        required(values, "WAFFO_PRIVATE_KEY", errors);
        if (values.WAFFO_ENVIRONMENT?.trim() !== "prod") {
          errors.push("WAFFO_ENVIRONMENT must be prod when Waffo is enabled.");
        }
        break;
      case "revenuecat":
        required(values, "REVENUECAT_WEBHOOK_SECRET", errors);
        break;
      default:
        errors.push(`Unsupported configured payment provider: ${provider}.`);
    }
  }
}

async function main() {
  const productionEnv = await readRequiredEnv(resolve(serverDir, ".env.production"));
  const expectedEnv = await readRequiredEnv(resolve(serverDir, ".production-safety.env"));
  const configText = await readFile(resolve(serverDir, "wrangler.jsonc"), "utf8");
  const parseErrors: { error: number; offset: number; length: number }[] = [];
  const config = parseJsonc(configText, parseErrors);
  if (parseErrors.length > 0) {
    throw new Error("wrangler.jsonc contains invalid JSONC.");
  }

  const root = asObject(config, "root configuration");
  const vars = asObject(root.vars, "vars");
  const d1 = asArray(root.d1_databases, "d1_databases").find((binding) => binding.binding === "DB");
  const r2 = asArray(root.r2_buckets, "r2_buckets").find(
    (binding) => binding.binding === "STORAGE",
  );
  const queues = asObject(root.queues, "queues");
  const jobProducer = asArray(queues.producers, "queues.producers").find(
    (binding) => binding.binding === "JOB_QUEUE",
  );
  const queueConsumers = asArray(queues.consumers, "queues.consumers");
  if (!d1 || !r2 || !jobProducer) {
    throw new Error("wrangler.jsonc must bind DB (D1), STORAGE (R2), and JOB_QUEUE.");
  }

  const workerName = String(root.name ?? "");
  const databaseId = String(d1.database_id ?? "");
  const bucketName = String(r2.bucket_name ?? "");
  const websiteUrl = String(vars.WEBSITE_URL ?? "");
  const serverUrl = String(vars.SERVER_URL ?? "");
  const queueName = String(jobProducer.queue ?? "");
  const queueConsumer = queueConsumers.find((consumer) => consumer.queue === queueName);
  const dlqName = String(queueConsumer?.dead_letter_queue ?? "");
  const errors: string[] = [];

  if (vars.NODE_ENV !== "production") errors.push("NODE_ENV must be production in wrangler.jsonc.");
  if (productionEnv.ENVIRONMENT?.trim() !== "production") {
    errors.push("ENVIRONMENT must be production in .env.production.");
  }
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(databaseId)) {
    errors.push("DB must use a concrete D1 database_id.");
  }
  if (!bucketName) errors.push("STORAGE must use a concrete R2 bucket_name.");
  if (!isProductionUrl(websiteUrl)) errors.push("WEBSITE_URL must be a non-local HTTPS URL.");
  if (!isProductionUrl(serverUrl)) errors.push("SERVER_URL must be a non-local HTTPS URL.");

  requireExpected(expectedEnv, "WORKER_NAME", workerName, errors);
  requireExpected(expectedEnv, "D1_DATABASE_ID", databaseId, errors);
  requireExpected(expectedEnv, "R2_BUCKET", bucketName, errors);
  requireExpected(expectedEnv, "QUEUE_NAME", queueName, errors);
  requireExpected(expectedEnv, "QUEUE_DLQ_NAME", dlqName, errors);
  requireExpected(expectedEnv, "WEBSITE_URL", websiteUrl, errors);
  requireExpected(expectedEnv, "SERVER_URL", serverUrl, errors);
  if (!queueConsumer) errors.push("JOB_QUEUE must have a Worker consumer.");
  if (!dlqName) errors.push("JOB_QUEUE consumer must configure a dead_letter_queue.");
  if (!queueConsumers.some((consumer) => consumer.queue === dlqName)) {
    errors.push("The configured dead_letter_queue must have a Worker consumer.");
  }

  for (const name of ["WORKER_NAME", "D1_DATABASE_ID", "R2_BUCKET", "QUEUE_NAME"] as const) {
    const actual = required(productionEnv, name, errors);
    if (actual && actual !== expectedEnv[name]?.trim()) {
      errors.push(`${name} in .env.production must match .production-safety.env.`);
    }
  }

  if (productionEnv.CLOUDFLARE_D1_DATABASE_ID?.trim() !== databaseId) {
    errors.push("CLOUDFLARE_D1_DATABASE_ID must match the DB binding in wrangler.jsonc.");
  }

  const adminEmails = required(productionEnv, "ADMIN_EMAILS", errors);
  if (adminEmails && adminEmails.split(",").some((email) => !/^\S+@\S+\.\S+$/.test(email.trim()))) {
    errors.push("ADMIN_EMAILS must contain comma-separated email addresses.");
  }
  const authSecret = required(productionEnv, "BETTER_AUTH_SECRET", errors);
  if (authSecret && authSecret.length < 32) {
    errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");
  }
  validateProviderSecrets(productionEnv, errors);

  if (errors.length > 0) {
    throw new Error(`Production safety preflight failed:\n- ${errors.join("\n- ")}`);
  }

  console.log(`Production safety preflight passed for ${workerName}.`);
}

function selfCheck() {
  assert.equal(isProductionUrl("https://app.example.com"), true);
  assert.equal(isProductionUrl("http://app.example.com"), false);
  assert.equal(isProductionUrl("https://localhost"), false);

  const expectedErrors: string[] = [];
  requireExpected({ QUEUE_NAME: "jobs" }, "QUEUE_NAME", "jobs", expectedErrors);
  requireExpected({ QUEUE_NAME: "jobs" }, "QUEUE_NAME", "other", expectedErrors);
  assert.deepEqual(expectedErrors, ["QUEUE_NAME does not match wrangler.jsonc."]);

  const missingErrors: string[] = [];
  required({}, "D1_DATABASE_ID", missingErrors);
  required({}, "R2_BUCKET", missingErrors);
  required({}, "QUEUE_NAME", missingErrors);
  assert.deepEqual(missingErrors, [
    "Missing D1_DATABASE_ID in .env.production.",
    "Missing R2_BUCKET in .env.production.",
    "Missing QUEUE_NAME in .env.production.",
  ]);

  const validErrors: string[] = [];
  validateProviderSecrets(
    {
      STRIPE_SECRET_KEY: "sk_live_test",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      REVENUECAT_WEBHOOK_SECRET: "revenuecat-test",
    },
    validErrors,
  );
  assert.deepEqual(validErrors, []);

  const invalidErrors: string[] = [];
  validateProviderSecrets(
    {
      STRIPE_SECRET_KEY: "sk_test_test",
      STRIPE_WEBHOOK_SECRET: "not-a-webhook-secret",
      REVENUECAT_WEBHOOK_SECRET: "revenuecat-test",
    },
    invalidErrors,
  );
  assert.ok(invalidErrors.some((error) => error.includes("live key")));
  assert.ok(invalidErrors.some((error) => error.includes("whsec_")));
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
