import {
  resolveProductFeatures,
  resolveRequiredResources,
  type ResolvedEmailConfig,
  validateFeatureDependencies,
  type ProductFeatures,
} from "@repo/app-config";

export type EnvValues = Record<string, string | undefined>;

export type ValidationMessage = {
  code: string;
  message: string;
};

export type ProductionValidationResult = {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
};

export type ProductionConfigInput = {
  productionEnv: EnvValues;
  expectedEnv: EnvValues;
  server: {
    workerName: string;
    route: string;
    databaseId: string;
    bucketName?: string;
    queueName?: string;
    dlqName?: string;
    hasJobQueueConsumer?: boolean;
    hasDeadLetterQueueConsumer?: boolean;
    hasCron?: boolean;
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
    features?: ProductFeatures;
    paymentProviders: Iterable<string>;
    email: ResolvedEmailConfig;
    oauth: { github: boolean; google: boolean; apple: boolean };
    productionPriceIds: Array<{ label: string; production: string; test: string }>;
  };
};

const PLACEHOLDER_VALUE = /(?:^|[-_.])(?:your|replace|placeholder|template)(?:$|[-_.])|^<.+>$/i;
const PLACEHOLDER_HOSTNAME = /(^|\.)(?:example\.com|localhost|local|invalid)$|\.example$/i;
const ZERO_D1_ID = "00000000-0000-0000-0000-000000000000";

function add(messages: ValidationMessage[], code: string, message: string) {
  messages.push({ code, message });
}

function required(values: EnvValues, name: string, errors: ValidationMessage[]) {
  const value = values[name]?.trim();
  if (!value) add(errors, "MISSING_ENV_VALUE", `Missing ${name} in .env.production.`);
  return value;
}

function requireExpected(
  values: EnvValues,
  name: string,
  actual: string,
  errors: ValidationMessage[],
) {
  const expected = values[name]?.trim();
  if (!expected) {
    add(errors, "MISSING_EXPECTED_VALUE", `Missing ${name} in .production-safety.env.`);
  } else if (expected !== actual) {
    add(errors, "EXPECTED_VALUE_MISMATCH", `${name} does not match wrangler.jsonc.`);
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

function requireConcreteResource(
  name: string,
  value: string | undefined,
  errors: ValidationMessage[],
) {
  if (!value || isPlaceholderValue(value) || value === ZERO_D1_ID) {
    add(errors, "INVALID_RESOURCE_IDENTITY", `${name} must use a concrete production identity.`);
  }
}

function validateProviderSecrets(
  values: EnvValues,
  providers: Iterable<string>,
  errors: ValidationMessage[],
) {
  for (const provider of providers) {
    switch (provider) {
      case "stripe": {
        const key = required(values, "STRIPE_SECRET_KEY", errors);
        if (key && !key.startsWith("sk_live_")) {
          add(
            errors,
            "INVALID_STRIPE_SECRET_KEY",
            "STRIPE_SECRET_KEY must be a live key for production.",
          );
        }
        const webhookSecret = required(values, "STRIPE_WEBHOOK_SECRET", errors);
        if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
          add(
            errors,
            "INVALID_STRIPE_WEBHOOK_SECRET",
            "STRIPE_WEBHOOK_SECRET must start with whsec_.",
          );
        }
        break;
      }
      case "creem": {
        const key = required(values, "CREEM_API_KEY", errors);
        if (key && !key.startsWith("creem_live_")) {
          add(errors, "INVALID_CREEM_API_KEY", "CREEM_API_KEY must be a live key for production.");
        }
        required(values, "CREEM_WEBHOOK_SECRET", errors);
        break;
      }
      case "waffo":
        required(values, "WAFFO_MERCHANT_ID", errors);
        required(values, "WAFFO_PRIVATE_KEY", errors);
        if (values.WAFFO_ENVIRONMENT?.trim() !== "prod") {
          add(
            errors,
            "INVALID_WAFFO_ENVIRONMENT",
            "WAFFO_ENVIRONMENT must be prod when Waffo is enabled.",
          );
        }
        break;
      case "revenuecat":
        required(values, "REVENUECAT_WEBHOOK_SECRET", errors);
        break;
      default:
        add(
          errors,
          "UNSUPPORTED_PAYMENT_PROVIDER",
          `Unsupported configured payment provider: ${provider}.`,
        );
    }
  }
}

function validateFeatureContract(features: ProductFeatures, errors: ValidationMessage[]) {
  try {
    validateFeatureDependencies(features);
  } catch (error) {
    add(
      errors,
      "INVALID_FEATURE_COMBINATION",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Validates enabled capabilities and reports non-blocking stale configuration separately. */
export function validateProductionConfigResult(
  input: ProductionConfigInput,
): ProductionValidationResult {
  const { expectedEnv, productionEnv, requirements, server, web } = input;
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const features = requirements.features ?? resolveProductFeatures();
  const requiredResources = new Set(resolveRequiredResources(features));
  validateFeatureContract(features, errors);

  if (server.nodeEnv !== "production") {
    add(errors, "INVALID_NODE_ENV", "NODE_ENV must be production in server wrangler.jsonc.");
  }
  if (productionEnv.ENVIRONMENT?.trim() !== "production") {
    add(errors, "INVALID_ENVIRONMENT", "ENVIRONMENT must be production in .env.production.");
  }

  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(server.databaseId)) {
    add(errors, "INVALID_D1_DATABASE_ID", "DB must use a concrete D1 database_id.");
  }
  for (const [name, value] of [
    ["WORKER_NAME", server.workerName],
    ["D1_DATABASE_ID", server.databaseId],
    ["WEB_WORKER_NAME", web.workerName],
  ] as const) {
    requireConcreteResource(name, value, errors);
  }

  if (requiredResources.has("R2")) {
    requireConcreteResource("R2_BUCKET", server.bucketName, errors);
  } else if (server.bucketName) {
    add(
      warnings,
      "DISABLED_STORAGE_BINDING",
      "Storage is disabled but an R2 binding is still declared.",
    );
  }

  if (requiredResources.has("Queue")) {
    requireConcreteResource("QUEUE_NAME", server.queueName, errors);
    requireConcreteResource("QUEUE_DLQ_NAME", server.dlqName, errors);
    if (!server.hasJobQueueConsumer) {
      add(errors, "MISSING_QUEUE_CONSUMER", "Enabled Jobs require a Queue consumer.");
    }
    if (!server.hasDeadLetterQueueConsumer) {
      add(errors, "MISSING_DLQ_CONSUMER", "Enabled Jobs require a DLQ consumer.");
    }
    if (!server.hasCron) {
      add(errors, "MISSING_CRON", "Enabled Jobs require a Cron trigger.");
    }
  } else if (
    server.queueName ||
    server.dlqName ||
    server.hasJobQueueConsumer ||
    server.hasDeadLetterQueueConsumer ||
    server.hasCron
  ) {
    add(
      warnings,
      "DISABLED_JOBS_BINDING",
      "Jobs are disabled but Queue, DLQ, or Cron resources remain configured.",
    );
  }

  for (const [name, value] of [
    ["WEBSITE_URL", server.websiteUrl],
    ["SERVER_URL", server.serverUrl],
    ["Web VITE_APP_URL", web.websiteUrl],
    ["Web VITE_SERVER_URL", web.serverUrl],
  ] as const) {
    if (!isProductionUrl(value)) {
      add(errors, "INVALID_PRODUCTION_URL", `${name} must be a non-placeholder HTTPS URL.`);
    }
  }

  for (const [name, actual] of [
    ["EXPECTED_SERVER_WORKER", server.workerName],
    ["EXPECTED_WEB_WORKER", web.workerName],
    ["EXPECTED_WEB_HOST", getHostname(web.websiteUrl)],
    ["EXPECTED_API_HOST", getHostname(server.serverUrl)],
  ] as const) {
    requireExpected(expectedEnv, name, actual, errors);
  }

  if (web.apiServiceName !== server.workerName) {
    add(
      errors,
      "API_SERVICE_MISMATCH",
      "Web API_SERVICE must target the configured Server Worker.",
    );
  }
  if (server.route !== getHostname(server.serverUrl)) {
    add(errors, "SERVER_ROUTE_MISMATCH", "Server custom route must match SERVER_URL.");
  }
  if (web.websiteUrl !== server.websiteUrl || web.serverUrl !== server.serverUrl) {
    add(errors, "PUBLIC_URL_MISMATCH", "Web public URLs must match the Server Worker URLs.");
  }
  if (web.route !== getHostname(web.websiteUrl)) {
    add(errors, "WEB_ROUTE_MISMATCH", "Web custom route must match VITE_APP_URL.");
  }
  if (web.buildWebsiteUrl !== web.websiteUrl || web.buildServerUrl !== web.serverUrl) {
    add(
      errors,
      "WEB_BUILD_URL_MISMATCH",
      "Web .env.production URLs must match web wrangler.jsonc.",
    );
  }
  if (!isProductionUrl(`https://${web.route}`)) {
    add(errors, "INVALID_WEB_ROUTE", "Web route must use a non-placeholder production domain.");
  }

  if (features.admin) {
    const adminEmails = required(productionEnv, "ADMIN_EMAILS", errors);
    if (
      adminEmails &&
      adminEmails.split(",").some((email) => !/^\S+@\S+\.\S+$/.test(email.trim()))
    ) {
      add(
        errors,
        "INVALID_ADMIN_EMAILS",
        "ADMIN_EMAILS must contain comma-separated email addresses.",
      );
    }
  }
  const authSecret = required(productionEnv, "BETTER_AUTH_SECRET", errors);
  if (authSecret && authSecret.length < 32) {
    add(errors, "SHORT_AUTH_SECRET", "BETTER_AUTH_SECRET must be at least 32 characters.");
  }

  if (requirements.email.enabled && requirements.email.provider === "resend") {
    required(productionEnv, "RESEND_API_KEY", errors);
    const emailFrom = required(productionEnv, "EMAIL_FROM", errors);
    const email = emailFrom?.match(/^[^<>\s]+@([^<>\s]+)$/);
    if (!email || PLACEHOLDER_HOSTNAME.test(email[1]) || isPlaceholderValue(emailFrom ?? "")) {
      add(
        errors,
        "INVALID_EMAIL_FROM",
        "EMAIL_FROM must use a non-placeholder production sender domain.",
      );
    }
    if (requirements.email.capabilities.contactForm) {
      required(productionEnv, "CONTACT_RECIPIENT", errors);
    }
  } else if (productionEnv.RESEND_API_KEY?.trim() || productionEnv.EMAIL_FROM?.trim()) {
    add(
      warnings,
      "DISABLED_EMAIL_CONFIGURATION",
      "Email is disabled but Resend configuration remains.",
    );
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
      add(
        errors,
        "MISSING_OAUTH_CLIENT",
        `${clientId} must be configured when its OAuth provider is enabled.`,
      );
    }
    if (secret !== clientId) required(productionEnv, secret, errors);
  }

  const paymentProviders = features.billing ? requirements.paymentProviders : [];
  if (!features.billing && [...requirements.paymentProviders].length > 0) {
    add(
      warnings,
      "DISABLED_BILLING_CONFIGURATION",
      "Billing is disabled but payment provider configuration remains.",
    );
  }
  validateProviderSecrets(productionEnv, paymentProviders, errors);
  if (features.web.billing) {
    for (const price of requirements.productionPriceIds) {
      if (
        isPlaceholderValue(price.production) ||
        /(?:^|[_-])test(?:$|[_-])/i.test(price.production)
      ) {
        add(
          errors,
          "INVALID_PRODUCTION_PRICE",
          `${price.label} must use a non-test production price ID.`,
        );
      } else if (price.production === price.test) {
        add(
          errors,
          "SAME_TEST_AND_PRODUCTION_PRICE",
          `${price.label} production price ID must differ from its test price ID.`,
        );
      }
    }
  }

  return { errors, warnings };
}

/** Compatibility wrapper for callers that only handle blocking errors. */
export function validateProductionConfig(input: ProductionConfigInput): string[] {
  return validateProductionConfigResult(input).errors.map(({ message }) => message);
}

export const productionConfigTestUtils = {
  isProductionUrl,
  validateProviderSecrets,
};
