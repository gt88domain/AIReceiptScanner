import {
  resolveCommonConfig,
  resolveProductFeatures,
  resolveRequiredResources,
  type ResolvedEmailConfig,
  validateFeatureDependencies,
  type ProductFeatures,
} from "@repo/app-config";
import {
  normalizeControlAccessTeamDomain,
  normalizeControlReadHttpHost,
} from "../modules/control-read/config";

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
  /** Plaintext secrets from `.env.production`. Present only on the rotation/write path. */
  productionEnv?: EnvValues;
  expectedEnv: EnvValues;
  /** Secret names reported by `wrangler secret list`. Present on the daily deploy path. */
  liveSecrets?: string[];
  /** Base required-secret list declared in wrangler.jsonc `secrets.required`. */
  declaredSecrets?: string[];
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
    paymentPriceEnv?: string;
    oauthClientIds: { github: string; google: string; apple: string };
    controlReadHttpHost: string;
    controlAccessTeamDomain: string;
    controlAccessAud: string;
  };
  web: {
    workerName: string;
    route: string;
    apiServiceName: string;
    websiteUrl: string;
    serverUrl: string;
    buildWebsiteUrl: string;
    buildServerUrl: string;
    turnstileSiteKey: string;
  };
  requirements: {
    features?: ProductFeatures;
    paymentProviders: Iterable<string>;
    email: ResolvedEmailConfig;
    oauth: { github: boolean; google: boolean; apple: boolean };
    productionPriceIds: Array<{ label: string; production: string; test: string }>;
    productionProductIds: Array<{ label: string; value: string }>;
  };
};

const PLACEHOLDER_VALUE = /(?:^|[-_.])(?:your|replace|placeholder|template)(?:$|[-_.])|^<.+>$/i;
const PLACEHOLDER_HOSTNAME = /(^|\.)(?:example\.com|localhost|local|invalid)$|\.example$/i;
const ZERO_D1_ID = "00000000-0000-0000-0000-000000000000";
const IPV4_ADDRESS = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const SUPPORTED_PAYMENT_PROVIDERS = new Set(["stripe", "revenuecat"]);

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

function isSafeHostname(value: string) {
  const hostname = value.trim().toLowerCase();
  return (
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)+$/.test(hostname) &&
    !PLACEHOLDER_HOSTNAME.test(hostname) &&
    !IPV4_ADDRESS.test(hostname)
  );
}

function validateAuthBoundaryConfig(
  server: ProductionConfigInput["server"],
  errors: ValidationMessage[],
) {
  for (const [name, value] of [
    ["WEBSITE_URL", server.websiteUrl],
    ["SERVER_URL", server.serverUrl],
  ] as const) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      add(errors, "AUTH_PUBLIC_URL_INVALID", `${name} must be a valid public Auth URL.`);
      continue;
    }
    if (url.protocol !== "https:") {
      add(errors, "AUTH_PRODUCTION_URL_NOT_HTTPS", `${name} must use HTTPS for Auth cookies.`);
    }
  }

  const common = resolveCommonConfig();
  const cookieDomain = getHostname(common.app.websiteUrl);
  if (
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(cookieDomain) &&
    !PLACEHOLDER_HOSTNAME.test(cookieDomain)
  ) {
    add(
      errors,
      "AUTH_COOKIE_DOMAIN_TOO_BROAD",
      "The configured Auth cookie domain must not be a public suffix.",
    );
  } else if (!isSafeHostname(cookieDomain)) {
    add(
      errors,
      "AUTH_COOKIE_DOMAIN_INVALID",
      "The configured app website URL must provide a valid Auth cookie domain.",
    );
  }

  for (const hostname of common.auth.allowedRemoteAvatarHosts ?? []) {
    if (!isSafeHostname(hostname)) {
      add(
        errors,
        "AUTH_AVATAR_HOST_INVALID",
        "Every configured remote avatar host must be a concrete non-local hostname.",
      );
    }
  }

  try {
    const storageUrl = new URL(common.storage.publicPath, server.serverUrl);
    if (storageUrl.protocol !== "https:") {
      add(
        errors,
        "AUTH_AVATAR_STORAGE_HOST_NOT_HTTPS",
        "The Storage public base used for avatars must use HTTPS in production.",
      );
    }
  } catch {
    add(
      errors,
      "AUTH_AVATAR_STORAGE_HOST_NOT_HTTPS",
      "The Storage public base used for avatars must resolve to HTTPS in production.",
    );
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
      case "revenuecat":
        required(values, "REVENUECAT_WEBHOOK_SECRET", errors);
        break;
      default:
        break;
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

/**
 * Secret names the product configuration requires on the production Worker.
 * Derived from the same inputs as the plaintext checks so the presence-only
 * daily preflight (`wrangler secret list`) and the rotation write path agree.
 */
export function listRequiredSecrets(input: ProductionConfigInput): string[] {
  const { requirements, web, declaredSecrets } = input;
  const features = requirements.features ?? resolveProductFeatures();
  const names = new Set<string>(["BETTER_AUTH_SECRET", ...(declaredSecrets ?? [])]);
  if (features.admin) names.add("ADMIN_EMAILS");
  if (requirements.email.enabled && requirements.email.provider === "resend") {
    names.add("RESEND_API_KEY");
    names.add("EMAIL_FROM");
    if (requirements.email.capabilities.contactForm) names.add("CONTACT_RECIPIENT");
  }
  if (web.turnstileSiteKey.trim()) names.add("TURNSTILE_SECRET_KEY");
  if (requirements.oauth.github) names.add("GITHUB_CLIENT_SECRET");
  if (requirements.oauth.google) names.add("GOOGLE_CLIENT_SECRET");
  if (!features.billing) return [...names];
  for (const provider of requirements.paymentProviders) {
    switch (provider) {
      case "stripe":
        names.add("STRIPE_SECRET_KEY");
        names.add("STRIPE_WEBHOOK_SECRET");
        break;
      case "revenuecat":
        names.add("REVENUECAT_WEBHOOK_SECRET");
        break;
    }
  }
  return [...names];
}

function validateLiveSecrets(input: ProductionConfigInput, result: ProductionValidationResult) {
  const live = new Set(input.liveSecrets);
  const requiredNames = new Set(listRequiredSecrets(input));
  for (const name of requiredNames) {
    if (!live.has(name)) {
      add(
        result.errors,
        "MISSING_LIVE_SECRET",
        `${name} is required by the product configuration but missing from the live Worker. Set it via the secrets write path (pnpm -F server secrets:push:production).`,
      );
    }
  }
  for (const name of live) {
    if (!requiredNames.has(name)) {
      add(
        result.warnings,
        "UNDECLARED_LIVE_SECRET",
        `${name} exists on the live Worker but is not required by the product configuration. Remove it deliberately if it is stale.`,
      );
    }
  }
}

function validateControlReadHttpConfig(
  server: ProductionConfigInput["server"],
  errors: ValidationMessage[],
) {
  const host = server.controlReadHttpHost.trim();
  if (!host) return;
  if (!normalizeControlReadHttpHost(host)) {
    add(
      errors,
      "INVALID_CONTROL_READ_HTTP_HOST",
      "CONTROL_READ_HTTP_HOST must be one concrete non-local hostname.",
    );
  }
  if (!server.controlAccessTeamDomain.trim()) {
    add(
      errors,
      "MISSING_CONTROL_ACCESS_TEAM_DOMAIN",
      "CONTROL_ACCESS_TEAM_DOMAIN is required when Control HTTP is enabled.",
    );
  } else if (!normalizeControlAccessTeamDomain(server.controlAccessTeamDomain)) {
    add(
      errors,
      "INVALID_CONTROL_ACCESS_TEAM_DOMAIN",
      "CONTROL_ACCESS_TEAM_DOMAIN must be a concrete HTTPS origin.",
    );
  }
  const audience = server.controlAccessAud.trim();
  if (!audience) {
    add(
      errors,
      "MISSING_CONTROL_ACCESS_AUD",
      "CONTROL_ACCESS_AUD is required when Control HTTP is enabled.",
    );
  } else if (audience.length > 512) {
    add(errors, "INVALID_CONTROL_ACCESS_AUD", "CONTROL_ACCESS_AUD is too long.");
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
  validateAuthBoundaryConfig(server, errors);
  validateControlReadHttpConfig(server, errors);

  if (server.nodeEnv !== "production") {
    add(errors, "INVALID_NODE_ENV", "NODE_ENV must be production in server wrangler.jsonc.");
  }
  const usesProviderPrices = features.billing || features.credits;
  if (usesProviderPrices && server.paymentPriceEnv !== "prod") {
    add(
      errors,
      "INVALID_PAYMENTS_PRICE_ENV",
      'PAYMENTS_PRICE_ENV must be "prod" in the production server wrangler.jsonc.',
    );
  }
  if (productionEnv && productionEnv.ENVIRONMENT?.trim() !== "production") {
    add(errors, "INVALID_ENVIRONMENT", "ENVIRONMENT must be production in .env.production.");
  }
  if (input.liveSecrets) validateLiveSecrets(input, { errors, warnings });

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

  if (productionEnv) {
    // Plaintext secret checks: rotation/write path only. The daily deploy
    // preflight runs presence checks against `wrangler secret list` instead.
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
  }

  const publicFormsEnabled =
    requirements.email.enabled &&
    (requirements.email.capabilities.contactForm || requirements.email.capabilities.newsletter);
  const hasTurnstileSiteKey = Boolean(web.turnstileSiteKey.trim());
  const hasTurnstileSecret = productionEnv
    ? Boolean(productionEnv.TURNSTILE_SECRET_KEY?.trim())
    : Boolean(input.liveSecrets?.includes("TURNSTILE_SECRET_KEY"));
  if (hasTurnstileSiteKey !== hasTurnstileSecret) {
    add(
      errors,
      "PARTIAL_TURNSTILE_CONFIGURATION",
      "VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be configured together.",
    );
  } else if (publicFormsEnabled && !hasTurnstileSiteKey) {
    add(
      errors,
      "MISSING_PUBLIC_FORM_PROTECTION",
      "Public forms require VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in production.",
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
    if (productionEnv && secret !== clientId) required(productionEnv, secret, errors);
  }

  const paymentProviders = features.billing ? requirements.paymentProviders : [];
  if (!features.billing && [...requirements.paymentProviders].length > 0) {
    add(
      warnings,
      "DISABLED_BILLING_CONFIGURATION",
      "Billing is disabled but payment provider configuration remains.",
    );
  }
  for (const provider of paymentProviders) {
    if (!SUPPORTED_PAYMENT_PROVIDERS.has(provider)) {
      add(
        errors,
        "UNSUPPORTED_PAYMENT_PROVIDER",
        `Unsupported configured payment provider: ${provider}.`,
      );
    }
  }
  if (productionEnv) validateProviderSecrets(productionEnv, paymentProviders, errors);
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
  if (features.native.billing || features.native.creditPurchases) {
    for (const product of requirements.productionProductIds) {
      if (isPlaceholderValue(product.value)) {
        add(
          errors,
          "INVALID_PRODUCTION_PRODUCT_ID",
          `${product.label} must replace the template placeholder with a production product ID.`,
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
  isSafeHostname,
  normalizeControlAccessTeamDomain,
  normalizeControlReadHttpHost,
  validateProviderSecrets,
};
