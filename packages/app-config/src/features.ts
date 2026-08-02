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
export function validateFeatureDependencies(features = resolveProductFeatures()) {
  if (features.web.creditPurchases && !features.web.credits) {
    throw new Error("[features] Web credit purchases require web credits.");
  }

  if (features.native.creditPurchases && !features.native.credits) {
    throw new Error("[features] Native credit purchases require native credits.");
  }

  if (features.web.creditPurchases && !features.web.billing) {
    throw new Error("[features] Web credit purchases require web billing.");
  }

  if (features.native.creditPurchases && !features.native.billing) {
    throw new Error("[features] Native credit purchases require native billing.");
  }

  if (features.billing && !features.jobs) {
    throw new Error("[features] Billing requires jobs for webhook recovery and outbox delivery.");
  }

  return features;
}
