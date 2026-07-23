import {
  resolveNativeCommonConfig,
  resolveProductFeatures,
  resolveWebCommonConfig,
  validateFeatureDependencies,
  type ProductFeatures,
} from "@repo/app-config";
import { z } from "zod";

type ServerRuntimeEnv = {
  ADMIN_EMAILS?: unknown;
  BETTER_AUTH_SECRET?: unknown;
  CREEM_API_KEY?: unknown;
  CREEM_WEBHOOK_SECRET?: unknown;
  REVENUECAT_WEBHOOK_SECRET?: unknown;
  STORAGE?: unknown;
  STRIPE_SECRET_KEY?: unknown;
  STRIPE_WEBHOOK_SECRET?: unknown;
  WAFFO_MERCHANT_ID?: unknown;
  WAFFO_PRIVATE_KEY?: unknown;
};

const requiredString = z.string().trim().min(1);

/** The server capability contract is derived from shared, public configuration only. */
export const productFeatures = validateFeatureDependencies(resolveProductFeatures());

export type ServerFeature = "admin" | "billing" | "credits" | "storage";

export function isServerFeatureEnabled(feature: ServerFeature) {
  return productFeatures[feature];
}

export function isNativeBillingEnabled() {
  return productFeatures.native.billing;
}

function requireValue(env: ServerRuntimeEnv, name: keyof ServerRuntimeEnv, missing: string[]) {
  if (!requiredString.safeParse(env[name]).success) {
    missing.push(name);
  }
}

function validateWebBillingEnvironment(env: ServerRuntimeEnv, missing: string[]) {
  const provider = resolveWebCommonConfig().payments?.provider;

  switch (provider) {
    case "stripe":
      requireValue(env, "STRIPE_SECRET_KEY", missing);
      requireValue(env, "STRIPE_WEBHOOK_SECRET", missing);
      return;
    case "creem":
      requireValue(env, "CREEM_API_KEY", missing);
      requireValue(env, "CREEM_WEBHOOK_SECRET", missing);
      return;
    case "waffo":
      requireValue(env, "WAFFO_MERCHANT_ID", missing);
      requireValue(env, "WAFFO_PRIVATE_KEY", missing);
      return;
  }
}

function validateNativeBillingEnvironment(env: ServerRuntimeEnv, missing: string[]) {
  if (resolveNativeCommonConfig().payments?.provider === "revenuecat") {
    requireValue(env, "REVENUECAT_WEBHOOK_SECRET", missing);
  }
}

/**
 * Validates only secrets and bindings needed by enabled server modules.
 *
 * `requireStorageBinding` stays false for the Node-based module check because
 * bindings exist only in the Worker runtime and Wrangler validates them at deploy time.
 */
export function validateServerModuleEnvironment(
  env: ServerRuntimeEnv,
  options: { requireStorageBinding?: boolean } = {},
): ProductFeatures {
  const missing: string[] = [];
  requireValue(env, "BETTER_AUTH_SECRET", missing);

  if (productFeatures.admin) {
    requireValue(env, "ADMIN_EMAILS", missing);
  }

  if (productFeatures.web.billing) {
    validateWebBillingEnvironment(env, missing);
  }

  if (productFeatures.native.billing) {
    validateNativeBillingEnvironment(env, missing);
  }

  if (productFeatures.storage && options.requireStorageBinding && !env.STORAGE) {
    missing.push("STORAGE binding");
  }

  if (missing.length > 0) {
    throw new Error(`[config] Missing required values for enabled modules: ${missing.join(", ")}`);
  }

  return productFeatures;
}
