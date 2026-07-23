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

/** Resolves one public, provider-secret-free capability contract for every runtime. */
export function resolveProductFeatures(): ProductFeatures {
  const commonConfig = resolveCommonConfig();
  const webConfig = resolveWebCommonConfig();
  const nativeConfig = resolveNativeCommonConfig();
  const webBilling = webConfig.payments?.enabled === true;
  const nativeBilling = nativeConfig.payments?.enabled === true;
  const webCredits = webConfig.credits.enabled === true;
  const nativeCredits = nativeConfig.credits.enabled === true;

  return {
    auth: true,
    admin: commonConfig.features.admin ?? true,
    billing: webBilling || nativeBilling,
    credits: webCredits || nativeCredits,
    storage: commonConfig.storage.enabled === true,
    jobs: commonConfig.features.jobs ?? true,
    web: {
      billing: webBilling,
      credits: webCredits,
      creditPurchases: isCreditPurchasesEnabled(webConfig.credits),
    },
    native: {
      billing: nativeBilling,
      credits: nativeCredits,
      creditPurchases: isCreditPurchasesEnabled(nativeConfig.credits),
    },
  };
}

/** Rejects only impossible module combinations before a server starts handling work. */
export function validateFeatureDependencies(features = resolveProductFeatures()) {
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
