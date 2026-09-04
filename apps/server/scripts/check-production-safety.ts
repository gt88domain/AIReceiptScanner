import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseEnv } from "dotenv";
import { parse as parseJsonc } from "jsonc-parser";
import {
  createProductFeatures,
  createDefaultProductDescriptor,
  resolveEmailConfig,
  resolveCommonConfig,
  resolveNativeCommonConfig,
  resolveWebCommonConfig,
} from "@repo/app-config";
import {
  listRequiredSecrets,
  validateProductionConfigResult,
  type EnvValues,
  type ProductionConfigInput,
} from "../src/config/production";

const execFileAsync = promisify(execFile);

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

async function readOptionalEnv(path: string) {
  try {
    await access(path);
  } catch {
    return undefined;
  }

  return parseEnv(await readFile(path));
}

type WranglerSecretEntry = { name: string; type?: string };

async function listLiveSecrets(workerName: string): Promise<string[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "pnpm",
      ["exec", "wrangler", "secret", "list", "--name", workerName, "--format", "json"],
      { cwd: serverDir, maxBuffer: 8 * 1024 * 1024 },
    ));
  } catch (error) {
    const detail =
      error instanceof Error
        ? (((error as { stderr?: string }).stderr ?? error.message) as string)
        : String(error);
    throw new Error(
      `Failed to list live secrets for ${workerName} via Wrangler. ` +
        `Run \`pnpm exec wrangler login\` (then \`pnpm exec wrangler whoami\` to verify) and retry. ` +
        `Wrangler said: ${detail.trim()}`,
    );
  }
  let entries: WranglerSecretEntry[];
  try {
    entries = JSON.parse(stdout) as WranglerSecretEntry[];
  } catch {
    throw new Error(`Unexpected \`wrangler secret list\` output for ${workerName}.`);
  }
  return entries.map((entry) => entry.name);
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
          label: `packages/app-config/src/app-config.ts appConfig.web.payments.plans[${plan.id}].prices[${price.id}]`,
          production: price.prod?.providerPriceId ?? "",
          test: price.test?.providerPriceId ?? "",
        });
      }
    }
  }
  for (const creditPackage of features.web.creditPurchases ? web.credits.packages : []) {
    if (creditPackage.status !== "archived" && creditPackage.web?.provider === "stripe") {
      prices.push({
        label: `packages/app-config/src/product-config.ts productConfig.webCreditPackages[${creditPackage.id}].web`,
        production: creditPackage.web.prod?.providerPriceId ?? "",
        test: creditPackage.web.test?.providerPriceId ?? "",
      });
    }
  }
  return prices;
}

function configuredProductionProductIds(
  features: ReturnType<typeof createDefaultProductDescriptor>["composition"]["features"],
) {
  const products: Array<{ label: string; value: string }> = [];
  const native = resolveNativeCommonConfig();

  if (features.native.billing) {
    for (const platform of ["ios", "android"] as const) {
      for (const plan of native.payments?.[platform]?.plans ?? []) {
        if (plan.status === "archived") continue;
        for (const price of plan.prices ?? []) {
          if (price.status !== "archived") {
            products.push({
              label: `packages/app-config/src/app-config.ts appConfig.native.payments.${platform}.plans[${plan.id}].prices[${price.id}].providerPriceId`,
              value: price.providerPriceId,
            });
          }
        }
      }
    }
  }

  if (features.native.creditPurchases) {
    for (const creditPackage of native.credits.packages) {
      if (creditPackage.status === "archived") continue;
      for (const platform of ["ios", "android"] as const) {
        const product = creditPackage.native?.[platform];
        if (product && product.status !== "archived") {
          products.push({
            label: `packages/app-config/src/product-config.ts productConfig.nativeCreditPackages[${creditPackage.id}].native.${platform}.providerProductId`,
            value: product.providerProductId,
          });
        }
      }
    }
  }

  return products;
}

async function loadProductionConfig(
  productionEnv: EnvValues | undefined,
  expectedEnv: EnvValues,
  webProductionEnv: EnvValues | undefined,
) {
  const [serverConfig, webConfig] = await Promise.all([
    readJsonc(resolve(serverDir, "wrangler.jsonc"), "server wrangler.jsonc"),
    readJsonc(resolve(rootDir, "apps/web/wrangler.jsonc"), "web wrangler.jsonc"),
  ]);
  const serverVars = asObject(serverConfig.vars, "server vars");
  const webVars = asObject(webConfig.vars, "web vars");
  const secretsBlock = asOptionalObject(serverConfig.secrets, "server secrets");
  const declaredSecrets = Array.isArray(secretsBlock.required)
    ? secretsBlock.required.map(String)
    : [];
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
    declaredSecrets,
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
      controlReadHttpHost: value(serverVars, "CONTROL_READ_HTTP_HOST"),
      controlAccessTeamDomain: value(serverVars, "CONTROL_ACCESS_TEAM_DOMAIN"),
      controlAccessAud: value(serverVars, "CONTROL_ACCESS_AUD"),
    },
    web: {
      workerName: value(webConfig, "name"),
      route: value(route, "pattern"),
      apiServiceName: value(apiService, "service"),
      websiteUrl: value(webVars, "VITE_APP_URL"),
      serverUrl: value(webVars, "VITE_SERVER_URL"),
      turnstileSiteKey: value(webVars, "VITE_TURNSTILE_SITE_KEY"),
      // Absent build-env file falls back to the wrangler.jsonc vars that the
      // deploy-time sync generates from, so the mismatch check only fires on
      // a real hand-maintained drift.
      buildWebsiteUrl: webProductionEnv?.VITE_APP_URL?.trim() || value(webVars, "VITE_APP_URL"),
      buildServerUrl:
        webProductionEnv?.VITE_SERVER_URL?.trim() || value(webVars, "VITE_SERVER_URL"),
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
      productionProductIds: configuredProductionProductIds(features),
    },
  };
}

/**
 * Daily deploy preflight (presence mode): verifies Worker/D1/R2/Queue/domain
 * identities against `.production-safety.env` and diffs the live Worker's
 * secret names (`wrangler secret list`) against the product configuration's
 * required secrets. Wrangler cannot read secret values back by design, so no
 * plaintext secrets are needed on the deploying machine.
 *
 * Rotation/write path (`--with-secrets`): additionally validates the plaintext
 * values in `apps/server/.env.production` before `wrangler secret bulk` pushes
 * them. This is the only mode that requires local plaintext secrets.
 */
async function main() {
  const withSecrets = process.argv.includes("--with-secrets");
  const productionEnv = withSecrets
    ? await readRequiredEnv(resolve(serverDir, ".env.production"))
    : await readOptionalEnv(resolve(serverDir, ".env.production"));
  const expectedEnv = await readRequiredEnv(resolve(serverDir, ".production-safety.env"));
  // Web build URLs are generated from web wrangler.jsonc at deploy time
  // (scripts/sync-production-env.mjs); a hand-maintained copy, when present,
  // is still cross-checked. A fresh deploy machine needs neither file.
  const webProductionEnv = await readOptionalEnv(resolve(rootDir, "apps/web/.env.production"));
  const input = await loadProductionConfig(productionEnv, expectedEnv, webProductionEnv);
  if (!withSecrets) {
    input.liveSecrets = await listLiveSecrets(input.server.workerName);
  }
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
  console.log(
    withSecrets
      ? `Production secrets validation passed for ${input.server.workerName} ` +
          `(${listRequiredSecrets(input).length} required secrets checked).`
      : `Production safety preflight passed for ${input.server.workerName} ` +
          `(${input.liveSecrets?.length ?? 0} live secrets present, ` +
          `${listRequiredSecrets(input).length} required).`,
  );
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
      TURNSTILE_SECRET_KEY: "turnstile_secret",
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
      controlReadHttpHost: "",
      controlAccessTeamDomain: "",
      controlAccessAud: "",
    },
    web: {
      workerName: "acme-web",
      route: "app.acme.test",
      apiServiceName: "acme-api",
      websiteUrl: "https://app.acme.test",
      serverUrl: "https://api.acme.test",
      buildWebsiteUrl: "https://app.acme.test",
      buildServerUrl: "https://api.acme.test",
      turnstileSiteKey: "turnstile_site_key",
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
      productionProductIds: [],
    },
  };

  const errors = (input: ProductionConfigInput) =>
    validateProductionConfigResult(input).errors.map(({ message }) => message);

  assert.deepEqual(errors(validInput), []);
  assert.ok(
    validateProductionConfigResult({
      ...validInput,
      productionEnv: {
        ...validInput.productionEnv,
        REVENUECAT_WEBHOOK_SECRET: "revenuecat_webhook_secret",
      },
      requirements: {
        ...validInput.requirements,
        features: createProductFeatures({
          admin: true,
          jobs: true,
          mobile: true,
          storage: true,
          web: { billing: true, credits: true, creditPurchases: true },
          native: { billing: true, credits: true, creditPurchases: true },
        }),
        paymentProviders: new Set(["stripe", "revenuecat"]),
        productionProductIds: [
          {
            label:
              "packages/app-config/src/app-config.ts appConfig.native.payments.ios.plans[pro].prices[monthly].providerPriceId",
            value: "replace-with-revenuecat-ios-product-id",
          },
        ],
      },
    }).errors.some(
      ({ code, message }) =>
        code === "INVALID_PRODUCTION_PRODUCT_ID" &&
        message.includes("packages/app-config/src/app-config.ts"),
    ),
  );
  assert.match(
    validateProductionConfigResult({
      ...validInput,
      web: { ...validInput.web, turnstileSiteKey: "" },
    })
      .errors.map(({ code }) => code)
      .join("\n"),
    /PARTIAL_TURNSTILE_CONFIGURATION/,
  );
  const controlHttpEnabledInput = {
    ...validInput,
    server: {
      ...validInput.server,
      controlReadHttpHost: "control.acme.test",
      controlAccessTeamDomain: "https://team.cloudflareaccess.com",
      controlAccessAud: "control-audience",
    },
  };
  assert.deepEqual(errors(controlHttpEnabledInput), []);
  assert.match(
    errors({
      ...controlHttpEnabledInput,
      server: { ...controlHttpEnabledInput.server, controlAccessTeamDomain: "" },
    }).join("\n"),
    /CONTROL_ACCESS_TEAM_DOMAIN is required/,
  );
  assert.match(
    errors({
      ...controlHttpEnabledInput,
      server: { ...controlHttpEnabledInput.server, controlAccessAud: "" },
    }).join("\n"),
    /CONTROL_ACCESS_AUD is required/,
  );
  assert.match(
    errors({
      ...controlHttpEnabledInput,
      server: { ...controlHttpEnabledInput.server, controlReadHttpHost: "*.acme.test" },
    }).join("\n"),
    /CONTROL_READ_HTTP_HOST must be one concrete non-local hostname/,
  );
  assert.match(
    errors({
      ...controlHttpEnabledInput,
      server: { ...controlHttpEnabledInput.server, controlReadHttpHost: "localhost" },
    }).join("\n"),
    /CONTROL_READ_HTTP_HOST must be one concrete non-local hostname/,
  );
  assert.match(
    validateProductionConfigResult({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, TURNSTILE_SECRET_KEY: "" },
    })
      .errors.map(({ code }) => code)
      .join("\n"),
    /PARTIAL_TURNSTILE_CONFIGURATION/,
  );
  assert.match(
    validateProductionConfigResult({
      ...validInput,
      productionEnv: { ...validInput.productionEnv, TURNSTILE_SECRET_KEY: "" },
      web: { ...validInput.web, turnstileSiteKey: "" },
    })
      .errors.map(({ code }) => code)
      .join("\n"),
    /MISSING_PUBLIC_FORM_PROTECTION/,
  );
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
  assert.ok(
    validateProductionConfigResult({
      ...validInput,
      server: { ...validInput.server, websiteUrl: "http://app.acme.test" },
    }).errors.some(({ code }) => code === "AUTH_PRODUCTION_URL_NOT_HTTPS"),
  );
  assert.ok(
    validateProductionConfigResult({
      ...validInput,
      server: { ...validInput.server, serverUrl: "not a URL" },
    }).errors.some(({ code }) => code === "AUTH_PUBLIC_URL_INVALID"),
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
      productionProductIds: [],
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

  // Presence mode (daily deploy path): no plaintext secrets, live names only.
  const presenceInput: ProductionConfigInput = {
    ...validInput,
    productionEnv: undefined,
    declaredSecrets: ["ADMIN_EMAILS", "BETTER_AUTH_SECRET"],
    liveSecrets: listRequiredSecrets({
      ...validInput,
      declaredSecrets: ["ADMIN_EMAILS", "BETTER_AUTH_SECRET"],
    }),
  };
  assert.deepEqual(errors(presenceInput), []);
  assert.match(
    validateProductionConfigResult({
      ...presenceInput,
      liveSecrets: (presenceInput.liveSecrets ?? []).filter((name) => name !== "STRIPE_SECRET_KEY"),
    })
      .errors.map(({ code }) => code)
      .join("\n"),
    /MISSING_LIVE_SECRET/,
  );
  assert.ok(
    validateProductionConfigResult({
      ...presenceInput,
      liveSecrets: [...(presenceInput.liveSecrets ?? []), "STALE_UNUSED_SECRET"],
    }).warnings.some(({ code }) => code === "UNDECLARED_LIVE_SECRET"),
  );
  // Presence mode must not require plaintext-only values.
  assert.ok(
    validateProductionConfigResult(presenceInput).errors.every(
      ({ code }) => code !== "INVALID_ENVIRONMENT",
    ),
  );
}

if (process.argv.includes("--self-check")) {
  selfCheck();
} else {
  await main();
}
