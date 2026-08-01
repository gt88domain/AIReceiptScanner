export type EnvValues = Record<string, string | undefined>;

export type ProductionConfigInput = {
  productionEnv: EnvValues;
  expectedEnv: EnvValues;
  server: {
    workerName: string;
    route: string;
    databaseId: string;
    bucketName: string;
    queueName: string;
    dlqName: string;
    websiteUrl: string;
    serverUrl: string;
    nodeEnv: string;
    oauthClientIds: { github: string; google: string; apple: string };
  };
  web: {
    workerName: string;
    route: string;
    apiServiceName: string;
    websiteUrl: string;
    serverUrl: string;
    buildWebsiteUrl: string;
    buildServerUrl: string;
  };
  requirements: {
    paymentProviders: Iterable<string>;
    emailEnabled: boolean;
    oauth: { github: boolean; google: boolean; apple: boolean };
    productionPriceIds: Array<{ label: string; production: string; test: string }>;
  };
};

const PLACEHOLDER_VALUE = /(?:^|[-_.])(?:your|replace|placeholder|template)(?:$|[-_.])|^<.+>$/i;
const PLACEHOLDER_HOSTNAME = /(^|\.)(?:example\.com|localhost|local|invalid)$|\.example$/i;
const ZERO_D1_ID = "00000000-0000-0000-0000-000000000000";

function required(values: EnvValues, name: string, errors: string[]) {
  const value = values[name]?.trim();
  if (!value) errors.push(`Missing ${name} in .env.production.`);
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

function isPlaceholderValue(value: string) {
  return !value.trim() || PLACEHOLDER_VALUE.test(value.trim()) || value.includes("<");
}

function isProductionUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !PLACEHOLDER_HOSTNAME.test(url.hostname);
  } catch {
    return false;
  }
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function requireConcreteResource(name: string, value: string, errors: string[]) {
  if (isPlaceholderValue(value) || value === ZERO_D1_ID) {
    errors.push(`${name} must use a concrete production identity.`);
  }
}

function validateProviderSecrets(values: EnvValues, providers: Iterable<string>, errors: string[]) {
  for (const provider of providers) {
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

/** Validates the deploy target and enabled integration configuration before production deploys. */
export function validateProductionConfig(input: ProductionConfigInput) {
  const { expectedEnv, productionEnv, requirements, server, web } = input;
  const errors: string[] = [];

  if (server.nodeEnv !== "production")
    errors.push("NODE_ENV must be production in server wrangler.jsonc.");
  if (productionEnv.ENVIRONMENT?.trim() !== "production") {
    errors.push("ENVIRONMENT must be production in .env.production.");
  }

  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(server.databaseId)) {
    errors.push("DB must use a concrete D1 database_id.");
  }
  for (const [name, value] of [
    ["WORKER_NAME", server.workerName],
    ["D1_DATABASE_ID", server.databaseId],
    ["R2_BUCKET", server.bucketName],
    ["QUEUE_NAME", server.queueName],
    ["QUEUE_DLQ_NAME", server.dlqName],
    ["WEB_WORKER_NAME", web.workerName],
  ] as const) {
    requireConcreteResource(name, value, errors);
  }

  for (const [name, value] of [
    ["WEBSITE_URL", server.websiteUrl],
    ["SERVER_URL", server.serverUrl],
    ["Web VITE_APP_URL", web.websiteUrl],
    ["Web VITE_SERVER_URL", web.serverUrl],
  ] as const) {
    if (!isProductionUrl(value)) errors.push(`${name} must be a non-placeholder HTTPS URL.`);
  }

  for (const [name, actual] of [
    ["WORKER_NAME", server.workerName],
    ["D1_DATABASE_ID", server.databaseId],
    ["R2_BUCKET", server.bucketName],
    ["QUEUE_NAME", server.queueName],
    ["QUEUE_DLQ_NAME", server.dlqName],
    ["WEB_WORKER_NAME", web.workerName],
    ["WEBSITE_URL", server.websiteUrl],
    ["SERVER_URL", server.serverUrl],
  ] as const) {
    requireExpected(expectedEnv, name, actual, errors);
  }

  if (web.apiServiceName !== server.workerName) {
    errors.push("Web API_SERVICE must target the configured Server Worker.");
  }
  if (server.route !== getHostname(server.serverUrl)) {
    errors.push("Server custom route must match SERVER_URL.");
  }
  if (web.websiteUrl !== server.websiteUrl || web.serverUrl !== server.serverUrl) {
    errors.push("Web public URLs must match the Server Worker URLs.");
  }
  if (web.route !== getHostname(web.websiteUrl)) {
    errors.push("Web custom route must match VITE_APP_URL.");
  }
  if (web.buildWebsiteUrl !== web.websiteUrl || web.buildServerUrl !== web.serverUrl) {
    errors.push("Web .env.production URLs must match web wrangler.jsonc.");
  }
  if (!isProductionUrl(`https://${web.route}`)) {
    errors.push("Web route must use a non-placeholder production domain.");
  }

  for (const name of ["WORKER_NAME", "D1_DATABASE_ID", "R2_BUCKET", "QUEUE_NAME"] as const) {
    const actual = required(productionEnv, name, errors);
    if (actual && actual !== expectedEnv[name]?.trim()) {
      errors.push(`${name} in .env.production must match .production-safety.env.`);
    }
  }

  if (productionEnv.CLOUDFLARE_D1_DATABASE_ID?.trim() !== server.databaseId) {
    errors.push("CLOUDFLARE_D1_DATABASE_ID must match the DB binding in server wrangler.jsonc.");
  }

  const adminEmails = required(productionEnv, "ADMIN_EMAILS", errors);
  if (adminEmails && adminEmails.split(",").some((email) => !/^\S+@\S+\.\S+$/.test(email.trim()))) {
    errors.push("ADMIN_EMAILS must contain comma-separated email addresses.");
  }
  const authSecret = required(productionEnv, "BETTER_AUTH_SECRET", errors);
  if (authSecret && authSecret.length < 32) {
    errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");
  }

  if (requirements.emailEnabled) {
    required(productionEnv, "RESEND_API_KEY", errors);
    const emailFrom = required(productionEnv, "EMAIL_FROM", errors);
    const email = emailFrom?.match(/^[^<>\s]+@([^<>\s]+)$/);
    if (!email || PLACEHOLDER_HOSTNAME.test(email[1]) || isPlaceholderValue(emailFrom ?? "")) {
      errors.push("EMAIL_FROM must use a non-placeholder production sender domain.");
    }
  }

  for (const [enabled, clientId, value, secret] of [
    [
      requirements.oauth.github,
      "GITHUB_CLIENT_ID",
      server.oauthClientIds.github,
      "GITHUB_CLIENT_SECRET",
    ],
    [
      requirements.oauth.google,
      "GOOGLE_CLIENT_ID",
      server.oauthClientIds.google,
      "GOOGLE_CLIENT_SECRET",
    ],
    [
      requirements.oauth.apple,
      "APPLE_APP_BUNDLE_IDENTIFIER",
      server.oauthClientIds.apple,
      "APPLE_APP_BUNDLE_IDENTIFIER",
    ],
  ] as const) {
    if (!enabled) continue;
    if (isPlaceholderValue(value)) {
      errors.push(`${clientId} must be configured when its OAuth provider is enabled.`);
    }
    if (secret !== clientId) required(productionEnv, secret, errors);
  }

  validateProviderSecrets(productionEnv, requirements.paymentProviders, errors);
  for (const price of requirements.productionPriceIds) {
    if (
      isPlaceholderValue(price.production) ||
      /(?:^|[_-])test(?:$|[_-])/i.test(price.production)
    ) {
      errors.push(`${price.label} must use a non-test production price ID.`);
    } else if (price.production === price.test) {
      errors.push(`${price.label} production price ID must differ from its test price ID.`);
    }
  }

  return errors;
}

export const productionConfigTestUtils = { isProductionUrl, validateProviderSecrets };
