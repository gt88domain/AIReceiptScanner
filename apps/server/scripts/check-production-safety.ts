import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";
import { parse as parseJsonc } from "jsonc-parser";
import {
  createProductFeatures,
  createDefaultProductDescriptor,
  resolveEmailConfig,
  resolveCommonConfig,
  resolveWebCommonConfig,
} from "@repo/app-config";
import { validateProductionConfigResult, type EnvValues } from "../src/config/production";

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

function asOptionalArray(value: unknown, label: string): JsonObject[] {
  return value === undefined ? [] : asArray(value, label);
}

function asOptionalObject(value: unknown, label: string): JsonObject {
  return value === undefined ? {} : asObject(value, label);
}

function value(object: JsonObject, name: string) {
  return String(object[name] ?? "");
}

function configuredProductionPriceIds(
  features: ReturnType<typeof createDefaultProductDescriptor>["composition"]["features"],
) {
  const prices: Array<{ label: string; production: string; test: string }> = [];
  const web = resolveWebCommonConfig();

  if (!features.web.billing) return prices;

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
  for (const creditPackage of features.web.creditPurchases ? web.credits.packages : []) {
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
  const r2 = asOptionalArray(serverConfig.r2_buckets, "server r2_buckets").find(
    (binding) => binding.binding === "STORAGE",
  );
  const queues = asOptionalObject(serverConfig.queues, "server queues");
  const producer = asOptionalArray(queues.producers, "server queues.producers").find(
    (binding) => binding.binding === "JOB_QUEUE",
  );
  const consumers = asOptionalArray(queues.consumers, "server queues.consumers");
  const services = asArray(webConfig.services, "web services");
  const apiService = services.find((service) => service.binding === "API_SERVICE");
  const serverRoute = asArray(serverConfig.routes, "server routes").find(
    (entry) => entry.custom_domain === true,
  );
  const route = asArray(webConfig.routes, "web routes").find(
    (entry) => entry.custom_domain === true,
  );
  if (!d1 || !apiService || !serverRoute || !route) {
    throw new Error("Missing required DB, API_SERVICE, or custom-domain binding.");
  }

  const queueName = producer ? value(producer, "queue") : undefined;
  const consumer = queueName ? consumers.find((entry) => entry.queue === queueName) : undefined;
  const dlqName = consumer ? value(consumer, "dead_letter_queue") : undefined;
  const triggers = asOptionalObject(serverConfig.triggers, "server triggers");
  const hasCron = asOptionalArray(triggers.crons, "server triggers.crons").length > 0;

  const common = resolveCommonConfig();
  const descriptor = createDefaultProductDescriptor();
  const features = descriptor.composition.features;
  return {
    productionEnv,
    expectedEnv,
    server: {
      workerName: value(serverConfig, "name"),
      route: value(serverRoute, "pattern"),
      databaseId: value(d1, "database_id"),
      bucketName: r2 ? value(r2, "bucket_name") : undefined,
      queueName,
      dlqName,
      hasJobQueueConsumer: Boolean(consumer),
      hasDeadLetterQueueConsumer: Boolean(
        dlqName && consumers.some((entry) => entry.queue === dlqName),
      ),
      hasCron,
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
      features,
      paymentProviders: descriptor.configuredPaymentProviders,
      email: resolveEmailConfig(common),
      oauth: {
        github: common.auth.methods.githubEnabled === true,
        google: common.auth.methods.googleEnabled === true,
        apple: common.auth.methods.appleEnabled === true,
      },
      productionPriceIds: configuredProductionPriceIds(features),
    },
  };
}

async function main() {
  const productionEnv = await readRequiredEnv(resolve(serverDir, ".env.production"));
  const expectedEnv = await readRequiredEnv(resolve(serverDir, ".production-safety.env"));
  const webProductionEnv = await readRequiredEnv(resolve(rootDir, "apps/web/.env.production"));
  const input = await loadProductionConfig(productionEnv, expectedEnv, webProductionEnv);
  const result = validateProductionConfigResult(input);
  if (result.warnings.length > 0) {
    console.warn(
      `Production safety warnings:\n- ${result.warnings.map(({ message }) => message).join("\n- ")}`,
    );
  }
  if (result.errors.length > 0) {
    throw new Error(
      `Production safety preflight failed:\n- ${result.errors.map(({ message }) => message).join("\n- ")}`,
    );
  }
  console.log(`Production safety preflight passed for ${input.server.workerName}.`);
}

function selfCheck() {
  const validInput = {
    productionEnv: {
      ENVIRONMENT: "production",
      BETTER_AUTH_SECRET: "a".repeat(32),
      ADMIN_EMAILS: "admin@acme.test",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "noreply@acme.test",
      CONTACT_RECIPIENT: "support@acme.test",
      STRIPE_SECRET_KEY: "sk_live_test",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    },
    expectedEnv: {
      EXPECTED_SERVER_WORKER: "acme-api",
      EXPECTED_WEB_WORKER: "acme-web",
      EXPECTED_WEB_HOST: "app.acme.test",
      EXPECTED_API_HOST: "api.acme.test",
    },
    server: {
      workerName: "acme-api",
      route: "api.acme.test",
      databaseId: "12345678-1234-1234-1234-123456789abc",
      bucketName: "acme-assets",
      queueName: "acme-jobs",
      dlqName: "acme-jobs-dlq",
      hasJobQueueConsumer: true,
      hasDeadLetterQueueConsumer: true,
      hasCron: true,
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
      features: createProductFeatures({
        admin: true,
        jobs: true,
        storage: true,
        web: { billing: true, credits: true, creditPurchases: true },
        native: { billing: false, credits: false, creditPurchases: false },
      }),
      paymentProviders: new Set(["stripe"]),
      email: resolveEmailConfig(),
      oauth: { github: false, google: false, apple: false },
      productionPriceIds: [
        { label: "Stripe plan pro/monthly", production: "price_live", test: "price_test" },
      ],
    },
  };

  const errors = (input: typeof validInput) =>
    validateProductionConfigResult(input).errors.map(({ message }) => message);

  assert.deepEqual(errors(validInput), []);
  assert.match(
    errors({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, BETTER_AUTH_SECRET: "" },
    }).join("\n"),
    /Missing BETTER_AUTH_SECRET/,
  );
  assert.match(
    errors({
      ...validInput,
      server: { ...validInput.server, bucketName: "" },
    }).join("\n"),
    /R2_BUCKET must use a concrete production identity/,
  );
  assert.match(
    errors({
      ...validInput,
      server: { ...validInput.server, databaseId: "00000000-0000-0000-0000-000000000000" },
    }).join("\n"),
    /D1_DATABASE_ID must use a concrete production identity/,
  );
  assert.match(
    errors({
      ...validInput,
      server: { ...validInput.server, websiteUrl: "http://app.acme.test" },
    }).join("\n"),
    /WEBSITE_URL must be a non-placeholder HTTPS URL/,
  );
  assert.match(
    errors({
      ...validInput,
      server: { ...validInput.server, websiteUrl: "https://example.com" },
    }).join("\n"),
    /WEBSITE_URL must be a non-placeholder HTTPS URL/,
  );
  assert.match(
    errors({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, STRIPE_SECRET_KEY: "sk_test_test" },
    }).join("\n"),
    /STRIPE_SECRET_KEY must be a live key/,
  );
  assert.match(
    errors({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, EMAIL_FROM: "noreply@example.com" },
    }).join("\n"),
    /EMAIL_FROM must use a non-placeholder production sender domain/,
  );
  assert.match(
    errors({
      ...validInput,
      server: { ...validInput.server, workerName: "your-worker-name" },
    }).join("\n"),
    /WORKER_NAME must use a concrete production identity/,
  );

  const directoryInput = {
    ...validInput,
    productionEnv: {
      ...validInput.productionEnv,
      ADMIN_EMAILS: undefined,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
    },
    expectedEnv: validInput.expectedEnv,
    server: { ...validInput.server, bucketName: undefined },
    requirements: {
      ...validInput.requirements,
      features: createProductFeatures({
        admin: false,
        jobs: true,
        storage: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: { billing: false, credits: false, creditPurchases: false },
      }),
      paymentProviders: new Set<string>(),
      productionPriceIds: [],
    },
  };
  assert.deepEqual(errors(directoryInput), []);
  assert.match(
    errors({
      ...directoryInput,
      requirements: {
        ...directoryInput.requirements,
        features: createProductFeatures({
          admin: false,
          jobs: true,
          storage: true,
          web: { billing: false, credits: false, creditPurchases: false },
          native: { billing: false, credits: false, creditPurchases: false },
        }),
      },
    }).join("\n"),
    /R2_BUCKET/,
  );
  assert.deepEqual(
    errors({
      ...directoryInput,
      requirements: {
        ...directoryInput.requirements,
        features: createProductFeatures({
          admin: false,
          jobs: false,
          storage: false,
          web: { billing: false, credits: false, creditPurchases: false },
          native: { billing: false, credits: false, creditPurchases: false },
        }),
      },
    }),
    [],
  );
  const noJobsResourcesInput = {
    ...directoryInput,
    productionEnv: {
      ...directoryInput.productionEnv,
      QUEUE_NAME: undefined,
      QUEUE_DLQ_NAME: undefined,
    },
    expectedEnv: {
      ...directoryInput.expectedEnv,
      QUEUE_NAME: undefined,
      QUEUE_DLQ_NAME: undefined,
    },
    server: {
      ...directoryInput.server,
      queueName: undefined,
      dlqName: undefined,
      hasJobQueueConsumer: false,
      hasDeadLetterQueueConsumer: false,
      hasCron: false,
    },
    requirements: {
      ...directoryInput.requirements,
      features: createProductFeatures({
        admin: false,
        jobs: false,
        storage: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: { billing: false, credits: false, creditPurchases: false },
      }),
    },
  };
  assert.deepEqual(errors(noJobsResourcesInput), []);
  const residualJobsResult = validateProductionConfigResult({
    ...directoryInput,
    requirements: {
      ...directoryInput.requirements,
      features: createProductFeatures({
        admin: false,
        jobs: false,
        storage: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: { billing: false, credits: false, creditPurchases: false },
      }),
    },
  });
  assert.deepEqual(residualJobsResult.errors, []);
  assert.ok(residualJobsResult.warnings.some(({ code }) => code === "DISABLED_JOBS_BINDING"));
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  await main();
}
