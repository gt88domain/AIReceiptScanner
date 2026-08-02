import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";
import { parse as parseJsonc } from "jsonc-parser";
import {
  resolveCommonConfig,
  resolveNativeCommonConfig,
  resolveWebCommonConfig,
} from "@repo/app-config";
import { validateProductionConfig, type EnvValues } from "../src/config/production";

type JsonObject = Record<string, unknown>;

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(serverDir, "../..");

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

async function readJsonc(path: string, label: string) {
  const parseErrors: { error: number; offset: number; length: number }[] = [];
  const config = parseJsonc(await readFile(path, "utf8"), parseErrors);
  if (parseErrors.length > 0) throw new Error(`${label} contains invalid JSONC.`);
  return asObject(config, label);
}

function asObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  return value.map((item) => asObject(item, label));
}

function value(object: JsonObject, name: string) {
  return String(object[name] ?? "");
}

function configuredPaymentProviders() {
  const providers = new Set<string>();
  const common = resolveCommonConfig();
  const web = resolveWebCommonConfig();
  const native = common.features.mobile === true ? resolveNativeCommonConfig() : undefined;

  if (web.payments?.enabled) {
    providers.add(web.payments.provider);
    for (const plan of web.payments.plans) {
      for (const price of plan.prices ?? []) {
        if (price.status !== "archived") providers.add(price.provider);
      }
    }
  }
  if (web.credits.enabled) {
    for (const creditPackage of web.credits.packages) {
      if (creditPackage.status !== "archived" && creditPackage.web) {
        providers.add(creditPackage.web.provider);
      }
    }
  }
  if (native?.payments?.enabled) providers.add(native.payments.provider);
  if (native?.credits.enabled) {
    for (const creditPackage of native.credits.packages) {
      if (creditPackage.status === "archived") continue;
      for (const product of Object.values(creditPackage.native)) {
        if (product) providers.add(product.provider);
      }
    }
  }
  return providers;
}

function configuredProductionPriceIds() {
  const prices: Array<{ label: string; production: string; test: string }> = [];
  const web = resolveWebCommonConfig();

  for (const plan of web.payments?.plans ?? []) {
    if (plan.status === "archived") continue;
    for (const price of plan.prices ?? []) {
      if (price.status !== "archived" && price.provider === "stripe") {
        prices.push({
          label: `Stripe plan ${plan.id}/${price.id}`,
          production: price.prod?.providerPriceId ?? "",
          test: price.test?.providerPriceId ?? "",
        });
      }
    }
  }
  for (const creditPackage of web.credits.packages) {
    if (creditPackage.status !== "archived" && creditPackage.web?.provider === "stripe") {
      prices.push({
        label: `Stripe credits ${creditPackage.id}`,
        production: creditPackage.web.prod?.providerPriceId ?? "",
        test: creditPackage.web.test?.providerPriceId ?? "",
      });
    }
  }
  return prices;
}

async function loadProductionConfig(
  productionEnv: EnvValues,
  expectedEnv: EnvValues,
  webProductionEnv: EnvValues,
) {
  const [serverConfig, webConfig] = await Promise.all([
    readJsonc(resolve(serverDir, "wrangler.jsonc"), "server wrangler.jsonc"),
    readJsonc(resolve(rootDir, "apps/web/wrangler.jsonc"), "web wrangler.jsonc"),
  ]);
  const serverVars = asObject(serverConfig.vars, "server vars");
  const webVars = asObject(webConfig.vars, "web vars");
  const d1 = asArray(serverConfig.d1_databases, "server d1_databases").find(
    (binding) => binding.binding === "DB",
  );
  const r2 = asArray(serverConfig.r2_buckets, "server r2_buckets").find(
    (binding) => binding.binding === "STORAGE",
  );
  const queues = asObject(serverConfig.queues, "server queues");
  const producer = asArray(queues.producers, "server queues.producers").find(
    (binding) => binding.binding === "JOB_QUEUE",
  );
  const consumers = asArray(queues.consumers, "server queues.consumers");
  const services = asArray(webConfig.services, "web services");
  const apiService = services.find((service) => service.binding === "API_SERVICE");
  const serverRoute = asArray(serverConfig.routes, "server routes").find(
    (entry) => entry.custom_domain === true,
  );
  const route = asArray(webConfig.routes, "web routes").find(
    (entry) => entry.custom_domain === true,
  );
  if (!d1 || !r2 || !producer || !apiService || !serverRoute || !route) {
    throw new Error(
      "Missing required DB, STORAGE, JOB_QUEUE, API_SERVICE, or custom-domain binding.",
    );
  }

  const queueName = value(producer, "queue");
  const consumer = consumers.find((entry) => entry.queue === queueName);
  if (!consumer) throw new Error("JOB_QUEUE must have a Worker consumer.");
  const dlqName = value(consumer, "dead_letter_queue");
  if (!consumers.some((entry) => entry.queue === dlqName)) {
    throw new Error("JOB_QUEUE dead_letter_queue must have a Worker consumer.");
  }

  const common = resolveCommonConfig();
  return {
    productionEnv,
    expectedEnv,
    server: {
      workerName: value(serverConfig, "name"),
      route: value(serverRoute, "pattern"),
      databaseId: value(d1, "database_id"),
      bucketName: value(r2, "bucket_name"),
      queueName,
      dlqName,
      websiteUrl: value(serverVars, "WEBSITE_URL"),
      serverUrl: value(serverVars, "SERVER_URL"),
      nodeEnv: value(serverVars, "NODE_ENV"),
      oauthClientIds: {
        github: value(serverVars, "GITHUB_CLIENT_ID"),
        google: value(serverVars, "GOOGLE_CLIENT_ID"),
        apple: value(serverVars, "APPLE_APP_BUNDLE_IDENTIFIER"),
      },
    },
    web: {
      workerName: value(webConfig, "name"),
      route: value(route, "pattern"),
      apiServiceName: value(apiService, "service"),
      websiteUrl: value(webVars, "VITE_APP_URL"),
      serverUrl: value(webVars, "VITE_SERVER_URL"),
      buildWebsiteUrl: webProductionEnv.VITE_APP_URL?.trim() ?? "",
      buildServerUrl: webProductionEnv.VITE_SERVER_URL?.trim() ?? "",
    },
    requirements: {
      paymentProviders: configuredPaymentProviders(),
      emailEnabled: common.email.provider === "resend",
      oauth: {
        github: common.auth.methods.githubEnabled === true,
        google: common.auth.methods.googleEnabled === true,
        apple: common.auth.methods.appleEnabled === true,
      },
      productionPriceIds: configuredProductionPriceIds(),
    },
  };
}

async function main() {
  const productionEnv = await readRequiredEnv(resolve(serverDir, ".env.production"));
  const expectedEnv = await readRequiredEnv(resolve(serverDir, ".production-safety.env"));
  const webProductionEnv = await readRequiredEnv(resolve(rootDir, "apps/web/.env.production"));
  const input = await loadProductionConfig(productionEnv, expectedEnv, webProductionEnv);
  const errors = validateProductionConfig(input);
  if (errors.length > 0) {
    throw new Error(`Production safety preflight failed:\n- ${errors.join("\n- ")}`);
  }
  console.log(`Production safety preflight passed for ${input.server.workerName}.`);
}

function selfCheck() {
  const validInput = {
    productionEnv: {
      ENVIRONMENT: "production",
      WORKER_NAME: "acme-api",
      D1_DATABASE_ID: "12345678-1234-1234-1234-123456789abc",
      R2_BUCKET: "acme-assets",
      QUEUE_NAME: "acme-jobs",
      CLOUDFLARE_D1_DATABASE_ID: "12345678-1234-1234-1234-123456789abc",
      BETTER_AUTH_SECRET: "a".repeat(32),
      ADMIN_EMAILS: "admin@acme.test",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "noreply@acme.test",
      STRIPE_SECRET_KEY: "sk_live_test",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    },
    expectedEnv: {
      WORKER_NAME: "acme-api",
      D1_DATABASE_ID: "12345678-1234-1234-1234-123456789abc",
      R2_BUCKET: "acme-assets",
      QUEUE_NAME: "acme-jobs",
      QUEUE_DLQ_NAME: "acme-jobs-dlq",
      WEB_WORKER_NAME: "acme-web",
      WEBSITE_URL: "https://app.acme.test",
      SERVER_URL: "https://api.acme.test",
    },
    server: {
      workerName: "acme-api",
      route: "api.acme.test",
      databaseId: "12345678-1234-1234-1234-123456789abc",
      bucketName: "acme-assets",
      queueName: "acme-jobs",
      dlqName: "acme-jobs-dlq",
      websiteUrl: "https://app.acme.test",
      serverUrl: "https://api.acme.test",
      nodeEnv: "production",
      oauthClientIds: { github: "", google: "", apple: "" },
    },
    web: {
      workerName: "acme-web",
      route: "app.acme.test",
      apiServiceName: "acme-api",
      websiteUrl: "https://app.acme.test",
      serverUrl: "https://api.acme.test",
      buildWebsiteUrl: "https://app.acme.test",
      buildServerUrl: "https://api.acme.test",
    },
    requirements: {
      paymentProviders: new Set(["stripe"]),
      emailEnabled: true,
      oauth: { github: false, google: false, apple: false },
      productionPriceIds: [
        { label: "Stripe plan pro/monthly", production: "price_live", test: "price_test" },
      ],
    },
  };

  assert.deepEqual(validateProductionConfig(validInput), []);
  assert.match(
    validateProductionConfig({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, BETTER_AUTH_SECRET: "" },
    }).join("\n"),
    /Missing BETTER_AUTH_SECRET/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, R2_BUCKET: "" },
    }).join("\n"),
    /Missing R2_BUCKET/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      server: { ...validInput.server, databaseId: "00000000-0000-0000-0000-000000000000" },
    }).join("\n"),
    /D1_DATABASE_ID must use a concrete production identity/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      server: { ...validInput.server, websiteUrl: "http://app.acme.test" },
    }).join("\n"),
    /WEBSITE_URL must be a non-placeholder HTTPS URL/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      server: { ...validInput.server, websiteUrl: "https://example.com" },
    }).join("\n"),
    /WEBSITE_URL must be a non-placeholder HTTPS URL/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, STRIPE_SECRET_KEY: "sk_test_test" },
    }).join("\n"),
    /STRIPE_SECRET_KEY must be a live key/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, EMAIL_FROM: "noreply@example.com" },
    }).join("\n"),
    /EMAIL_FROM must use a non-placeholder production sender domain/,
  );
  assert.match(
    validateProductionConfig({
      ...validInput,
      server: { ...validInput.server, workerName: "your-worker-name" },
    }).join("\n"),
    /WORKER_NAME must use a concrete production identity/,
  );
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  await main();
}
