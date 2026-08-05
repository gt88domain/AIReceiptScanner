import {
  resolveEmailConfig,
  resolveProductFeatures,
  resolveWebCommonConfig,
  validateFeatureDependencies,
  type ProductFeatures,
} from "@repo/app-config";
import { z } from "zod";
import type { ServerRuntimeConfig } from "./runtime-config";

type ServerRuntimeEnv = {
  ADMIN_EMAILS?: unknown;
  BETTER_AUTH_SECRET?: unknown;
  CREEM_API_KEY?: unknown;
  CREEM_WEBHOOK_SECRET?: unknown;
  REVENUECAT_WEBHOOK_SECRET?: unknown;
  RESEND_API_KEY?: unknown;
  STORAGE?: unknown;
  STRIPE_SECRET_KEY?: unknown;
  STRIPE_WEBHOOK_SECRET?: unknown;
  WAFFO_MERCHANT_ID?: unknown;
  WAFFO_PRIVATE_KEY?: unknown;
};

const requiredString = z.string().trim().min(1);

/** Compatibility export for existing modules; the Worker runtime reuses this immutable result. */
export const productFeatures = validateFeatureDependencies(resolveProductFeatures());

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

/**
 * Validates only secrets and bindings needed by enabled server modules.
 *
 * `requireStorageBinding` stays false for the Node-based module check because
 * bindings exist only in the Worker runtime and Wrangler validates them at deploy time.
 */
export function validateServerModuleEnvironment(
  env: ServerRuntimeEnv,
  options: {
    features?: ProductFeatures;
    runtimeConfig?: ServerRuntimeConfig;
    requireStorageBinding?: boolean;
  } = {},
): ProductFeatures {
  const features =
    options.runtimeConfig?.features ??
    options.features ??
    validateFeatureDependencies(resolveProductFeatures());
  const email = options.runtimeConfig?.email ?? resolveEmailConfig();
  const missing: string[] = [];
  requireValue(env, "BETTER_AUTH_SECRET", missing);

  if (features.admin) {
    requireValue(env, "ADMIN_EMAILS", missing);
  }

  if (features.web.billing) {
    validateWebBillingEnvironment(env, missing);
  }

  if (features.mobile && features.native.billing) {
    requireValue(env, "REVENUECAT_WEBHOOK_SECRET", missing);
  }

  if (features.storage && options.requireStorageBinding && !env.STORAGE) {
    missing.push("STORAGE binding");
  }

  if (email.enabled && email.provider === "resend") {
    requireValue(env, "RESEND_API_KEY", missing);
  }

  if (missing.length > 0) {
    throw new Error(`[config] Missing required values for enabled modules: ${missing.join(", ")}`);
  }

  return features;
}
