import {
  resolveCommonConfig,
  resolveNativeCommonConfig,
  resolveWebCommonConfig,
} from "./app-config";

/** Resolved product capabilities. Provider choices and secrets stay outside this contract. */
export type ProductFeatures = {
  /** Authentication is currently a core template capability, not an optional module. */
  auth: true;
  admin: boolean;
  billing: boolean;
  credits: boolean;
  storage: boolean;
  jobs: boolean;
  mobile: boolean;
  web: {
    billing: boolean;
    credits: boolean;
    creditPurchases: boolean;
  };
  native: {
    billing: boolean;
    credits: boolean;
    creditPurchases: boolean;
  };
};

/** Cloudflare resources required by a resolved product capability contract. */
export type ProductResource = "D1" | "R2" | "Queue" | "DLQ" | "Cron";

/** Test-friendly capability inputs with no provider or environment information. */
export type ProductFeatureInput = {
  admin?: boolean;
  jobs?: boolean;
  mobile?: boolean;
  storage?: boolean;
  web: {
    billing: boolean;
    credits: boolean;
    creditPurchases: boolean;
  };
  native: {
    billing: boolean;
    credits: boolean;
    creditPurchases: boolean;
  };
};

/** Stable error codes for unsupported product capability combinations. */
export const FEATURE_DEPENDENCY_ERROR_CODES = [
  "BILLING_REQUIRES_JOBS",
  "WEB_CREDIT_PURCHASES_REQUIRE_CREDITS",
  "WEB_CREDIT_PURCHASES_REQUIRE_BILLING",
  "NATIVE_CREDIT_PURCHASES_REQUIRE_CREDITS",
  "NATIVE_CREDIT_PURCHASES_REQUIRE_BILLING",
  "NATIVE_BILLING_REQUIRES_MOBILE",
  "NATIVE_CREDITS_REQUIRE_MOBILE",
  "NATIVE_CREDIT_PURCHASES_REQUIRE_MOBILE",
] as const;

export type FeatureDependencyErrorCode = (typeof FEATURE_DEPENDENCY_ERROR_CODES)[number];

export type FeatureDependencyRule = {
  code: FeatureDependencyErrorCode;
  message: string;
};

/**
 * The single machine-readable dependency matrix used by config, profiles, and
 * production validation. Keep this provider- and secret-free.
 */
export const featureDependencyRules = {
  BILLING_REQUIRES_JOBS: {
    code: "BILLING_REQUIRES_JOBS",
    message: "Billing requires Jobs for webhook recovery and outbox delivery.",
  },
  WEB_CREDIT_PURCHASES_REQUIRE_CREDITS: {
    code: "WEB_CREDIT_PURCHASES_REQUIRE_CREDITS",
    message: "Web credit purchases require web Credits.",
  },
  WEB_CREDIT_PURCHASES_REQUIRE_BILLING: {
    code: "WEB_CREDIT_PURCHASES_REQUIRE_BILLING",
    message: "Web credit purchases require web Billing.",
  },
  NATIVE_CREDIT_PURCHASES_REQUIRE_CREDITS: {
    code: "NATIVE_CREDIT_PURCHASES_REQUIRE_CREDITS",
    message: "Native credit purchases require native Credits.",
  },
  NATIVE_CREDIT_PURCHASES_REQUIRE_BILLING: {
    code: "NATIVE_CREDIT_PURCHASES_REQUIRE_BILLING",
    message: "Native credit purchases require native Billing.",
  },
  NATIVE_BILLING_REQUIRES_MOBILE: {
    code: "NATIVE_BILLING_REQUIRES_MOBILE",
    message: "Native Billing requires Mobile.",
  },
  NATIVE_CREDITS_REQUIRE_MOBILE: {
    code: "NATIVE_CREDITS_REQUIRE_MOBILE",
    message: "Native Credits require Mobile.",
  },
  NATIVE_CREDIT_PURCHASES_REQUIRE_MOBILE: {
    code: "NATIVE_CREDIT_PURCHASES_REQUIRE_MOBILE",
    message: "Native credit purchases require Mobile.",
  },
} as const satisfies Record<FeatureDependencyErrorCode, FeatureDependencyRule>;

function isCreditPurchasesEnabled(config: {
  enabled?: boolean;
  purchasesEnabled?: boolean;
  packages: readonly unknown[];
}) {
  return config.enabled === true && (config.purchasesEnabled ?? config.packages.length > 0);
}

/** Creates a public, provider-secret-free contract for production or feature-matrix tests. */
export function createProductFeatures(input: ProductFeatureInput): ProductFeatures {
  const mobile = input.mobile ?? false;
  const native = mobile ? input.native : { billing: false, credits: false, creditPurchases: false };

  return {
    auth: true,
    admin: input.admin ?? true,
    billing: input.web.billing || native.billing,
    credits: input.web.credits || native.credits,
    storage: input.storage ?? false,
    jobs: input.jobs ?? true,
    mobile,
    web: input.web,
    native,
  };
}

/** Resolves the production contract from app configuration. */
export function resolveProductFeatures(): ProductFeatures {
  const commonConfig = resolveCommonConfig();
  const webConfig = resolveWebCommonConfig();
  const mobile = commonConfig.features.mobile === true;
  const nativeConfig = mobile ? resolveNativeCommonConfig() : undefined;
  const webBilling = webConfig.payments?.enabled === true;
  const nativeBilling = nativeConfig?.payments?.enabled === true;
  const webCredits = webConfig.credits.enabled === true;
  const nativeCredits = nativeConfig?.credits.enabled === true;

  return createProductFeatures({
    admin: commonConfig.features.admin ?? true,
    storage: commonConfig.storage.enabled === true,
    jobs: commonConfig.features.jobs ?? true,
    mobile,
    web: {
      billing: webBilling,
      credits: webCredits,
      creditPurchases: isCreditPurchasesEnabled(webConfig.credits),
    },
    native: {
      billing: nativeBilling,
      credits: nativeCredits,
      creditPurchases: nativeConfig ? isCreditPurchasesEnabled(nativeConfig.credits) : false,
    },
  });
}

/** Rejects only impossible module combinations before a server starts handling work. */
function featureDependencyError(rule: FeatureDependencyRule): Error {
  return new Error(`[features:${rule.code}] ${rule.message}`);
}

/** Rejects unsupported combinations before a server starts handling work. */
export function validateFeatureDependencies(features = resolveProductFeatures()): ProductFeatures {
  if (!features.mobile && features.native.billing) {
    throw featureDependencyError(featureDependencyRules.NATIVE_BILLING_REQUIRES_MOBILE);
  }

  if (!features.mobile && features.native.credits) {
    throw featureDependencyError(featureDependencyRules.NATIVE_CREDITS_REQUIRE_MOBILE);
  }

  if (!features.mobile && features.native.creditPurchases) {
    throw featureDependencyError(featureDependencyRules.NATIVE_CREDIT_PURCHASES_REQUIRE_MOBILE);
  }

  if (features.web.creditPurchases && !features.web.credits) {
    throw featureDependencyError(featureDependencyRules.WEB_CREDIT_PURCHASES_REQUIRE_CREDITS);
  }

  if (features.native.creditPurchases && !features.native.credits) {
    throw featureDependencyError(featureDependencyRules.NATIVE_CREDIT_PURCHASES_REQUIRE_CREDITS);
  }

  if (features.web.creditPurchases && !features.web.billing) {
    throw featureDependencyError(featureDependencyRules.WEB_CREDIT_PURCHASES_REQUIRE_BILLING);
  }

  if (features.native.creditPurchases && !features.native.billing) {
    throw featureDependencyError(featureDependencyRules.NATIVE_CREDIT_PURCHASES_REQUIRE_BILLING);
  }

  if (features.billing && !features.jobs) {
    throw featureDependencyError(featureDependencyRules.BILLING_REQUIRES_JOBS);
  }

  return features;
}

/**
 * Computes required infrastructure from the single feature contract. This is
 * intentionally descriptive: callers must never create or mutate resources.
 */
export function resolveRequiredResources(features: ProductFeatures): readonly ProductResource[] {
  const resources: ProductResource[] = ["D1"];
  if (features.storage) resources.push("R2");
  if (features.jobs) resources.push("Queue", "DLQ", "Cron");
  return resources;
}

/** User and admin backoffice visibility derived from the existing web capability contract. */
export function resolveBackofficeVisibility(features: Pick<ProductFeatures, "web">) {
  const payments = features.web.billing || features.web.creditPurchases;
  return {
    billing: features.web.billing,
    credits: features.web.credits,
    purchases: payments,
    payments,
  } as const;
}
