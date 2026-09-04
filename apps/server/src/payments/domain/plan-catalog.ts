import {
  type NormalizedPlan,
  normalizePaymentsConfig,
  type PaymentsConfig,
  paymentsConfig,
} from "@repo/app-config/payments/web";
import {
  listNormalizedNativePlansByPlatform,
  type NormalizedNativePlan,
  nativePaymentsConfig,
} from "@repo/app-config/payments/native";
import type { PersistedServerPaymentProviderKey, ServerPaymentProviderKey } from "@repo/app-config";
import { env } from "cloudflare:workers";
import { resolveProviderPriceEnvironment } from "@/lib/provider-price-environment";

type WebCatalogPrice = NormalizedPlan["prices"][number];
type NativeCatalogPrice = NormalizedNativePlan["prices"][number];
type BillingCatalogPrice = WebCatalogPrice | NativeCatalogPrice;
type BillingCatalogPlan = {
  id: string;
  status: NormalizedPlan["status"];
  prices: BillingCatalogPrice[];
};

/**
 * Normalized web checkout plans are loaded once and reused as read-only catalog data.
 */
const webConfig = normalizePaymentsConfig(
  paymentsConfig as PaymentsConfig,
  resolveProviderPriceEnvironment(env),
);
const nativeConfig = listNormalizedNativePlansByPlatform(nativePaymentsConfig);

// Native catalog entries are used only for persisted billing state. Web checkout
// APIs keep using webConfig so app-store products are never offered through web checkout.
const nativeCatalogs = [nativeConfig.ios, nativeConfig.android];

/**
 * Returns all web-purchasable plans and active prices for client presentation.
 */
function listConfiguredPlans(): NormalizedPlan[] {
  return webConfig
    .filter((plan) => plan.status === "active")
    .map((plan) => ({
      ...plan,
      prices: plan.prices.filter((price) => price.status === "active"),
    }));
}

/**
 * Finds a web checkout plan by internal plan ID.
 */
function findPlanById(planId: string): NormalizedPlan | undefined {
  return webConfig.find((plan) => plan.id === planId);
}

/**
 * Finds a web checkout price by internal price ID.
 */
function findPriceById(priceId: string): WebCatalogPrice | undefined {
  for (const plan of webConfig) {
    const price = plan.prices.find((item) => item.id === priceId);
    if (price) return price;
  }
  return undefined;
}

function findNativePlanById(planId: string): NormalizedNativePlan | undefined {
  for (const catalog of nativeCatalogs) {
    const plan = catalog.find((item) => item.id === planId);
    if (plan) return plan;
  }
  return undefined;
}

function findNativePriceById(priceId: string, planId?: string): NativeCatalogPrice | undefined {
  for (const catalog of nativeCatalogs) {
    for (const plan of catalog) {
      if (planId && plan.id !== planId) {
        continue;
      }

      const price = plan.prices.find((item) => item.id === priceId);
      if (price) return price;
    }
  }
  return undefined;
}

/**
 * Finds a billing plan across web and native payment catalogs.
 */
function findBillingPlanById(planId: string): BillingCatalogPlan | undefined {
  return findPlanById(planId) ?? findNativePlanById(planId);
}

/**
 * Finds a billing price across web and native payment catalogs.
 */
function findBillingPriceById(priceId: string): BillingCatalogPrice | undefined {
  return findPriceById(priceId) ?? findNativePriceById(priceId);
}

/**
 * Finds the billing price that matches a persisted provider billing record.
 */
function findBillingPriceForRecord(input: {
  provider: PersistedServerPaymentProviderKey;
  planId: string;
  priceId: string;
}): BillingCatalogPrice | undefined {
  // RevenueCat rows can reference prices that do not exist in the web checkout catalog.
  if (input.provider === "revenuecat") {
    return findNativePriceById(input.priceId, input.planId) ?? findPriceById(input.priceId);
  }

  return findPriceById(input.priceId) ?? findNativePriceById(input.priceId, input.planId);
}

/**
 * Finds a price by provider-specific price ID.
 */
function findPriceByProviderPriceId(
  provider: ServerPaymentProviderKey,
  providerPriceId: string,
): WebCatalogPrice | undefined {
  for (const plan of webConfig) {
    const price = plan.prices.find(
      (item) => item.provider === provider && item.providerPriceId === providerPriceId,
    );
    if (price) return price;
  }
  return undefined;
}

export {
  findBillingPlanById,
  findBillingPriceById,
  findBillingPriceForRecord,
  findPlanById,
  findPriceById,
  findPriceByProviderPriceId,
  listConfiguredPlans,
};
