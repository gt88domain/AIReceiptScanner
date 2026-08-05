import { resolveNativeCommonConfig, resolveWebCommonConfig } from "./app-config";
import { resolveProductFeatures, type ProductFeatures } from "./features";
import type {
  AppCreditsConfig,
  AppNativePaymentsConfig,
  AppWebPaymentsConfig,
  ServerPaymentProviderKey,
} from "./types";

export type ConfiguredPaymentProvidersInput = {
  features: ProductFeatures;
  webPayments?: AppWebPaymentsConfig;
  webCredits: AppCreditsConfig;
  nativePayments?: AppNativePaymentsConfig;
  nativeCredits?: AppCreditsConfig;
};

/** Pure provider derivation shared by runtime registration, profile reports, and preflight. */
export function resolveConfiguredPaymentProviders(
  input: ConfiguredPaymentProvidersInput,
): readonly ServerPaymentProviderKey[] {
  const providers = new Set<ServerPaymentProviderKey>();
  if (input.features.web.billing && input.webPayments?.enabled) {
    providers.add(input.webPayments.provider);
    for (const plan of input.webPayments.plans) {
      for (const price of plan.prices ?? [])
        if (price.status !== "archived") providers.add(price.provider);
    }
  }
  if (input.features.web.creditPurchases && input.webCredits.enabled) {
    for (const creditPackage of input.webCredits.packages) {
      const webPackage = creditPackage.web;
      if (creditPackage.status !== "archived" && webPackage && webPackage.status !== "archived") {
        providers.add(webPackage.provider);
      }
    }
  }
  if (input.features.mobile && input.features.native.billing && input.nativePayments?.enabled) {
    providers.add(input.nativePayments.provider);
  }
  if (
    input.features.mobile &&
    input.features.native.creditPurchases &&
    input.nativeCredits?.enabled
  ) {
    for (const creditPackage of input.nativeCredits.packages) {
      if (creditPackage.status === "archived") continue;
      for (const product of Object.values(creditPackage.native ?? {})) {
        if (product?.status !== "archived") providers.add(product.provider);
      }
    }
  }
  return [...providers];
}

/** Resolves the current product without reading Native configuration when Mobile is disabled. */
export function resolveCurrentConfiguredPaymentProviders(
  features = resolveProductFeatures(),
): readonly ServerPaymentProviderKey[] {
  const web = resolveWebCommonConfig();
  const native = features.mobile ? resolveNativeCommonConfig() : undefined;
  return resolveConfiguredPaymentProviders({
    features,
    webPayments: web.payments,
    webCredits: web.credits,
    nativePayments: native?.payments,
    nativeCredits: native?.credits,
  });
}
