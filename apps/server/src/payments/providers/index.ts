import type { ServerPaymentProviderKey } from "@repo/app-config";
import type { PaymentProvider } from "../public/types";
import { createRevenueCatPaymentProvider } from "./revenuecat/provider";
import { createStripePaymentProvider } from "./stripe/provider";

/**
 * Caches provider instances to avoid repeated SDK initialization.
 */
const providerCache = new Map<ServerPaymentProviderKey, PaymentProvider>();

/**
 * Resolves the payment provider key from explicit input or server defaults.
 */
export function resolvePaymentProviderKey(
  providerKey?: ServerPaymentProviderKey,
): ServerPaymentProviderKey {
  return providerKey ?? "stripe";
}

/**
 * Returns a singleton provider instance for the requested provider key.
 */
export function getPaymentProvider(providerKey?: ServerPaymentProviderKey): PaymentProvider {
  const resolvedKey = resolvePaymentProviderKey(providerKey);

  const cached = providerCache.get(resolvedKey);
  if (cached) {
    return cached;
  }

  const providers: Record<ServerPaymentProviderKey, () => PaymentProvider> = {
    stripe: createStripePaymentProvider,
    revenuecat: createRevenueCatPaymentProvider,
  };

  const createProvider = providers[resolvedKey];
  if (!createProvider) {
    throw new Error(`Payment provider not registered: ${resolvedKey}`);
  }

  const provider = createProvider();
  providerCache.set(resolvedKey, provider);
  return provider;
}
