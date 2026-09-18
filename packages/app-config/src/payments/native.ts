import { normalizePlanPricingConfig, type PricingConfigPlan } from "@repo/shared";
import { resolveNativeCommonConfig } from "../app-config";
import {
  membershipCatalogConfig,
  normalizeMembershipCatalogConfig,
  type NormalizedMembershipPlan,
  type NormalizedMembershipPrice,
} from "../membership";
import type {
  AppNativePaymentsPlatformConfig,
  BillingInterval,
  MembershipCatalogConfig,
  NativePaymentProviderKey,
  NativePriceConfig,
  PlanStatus,
  PriceType,
} from "../types";

/**
 * Supported pricing models for native plans.
 */
export const NATIVE_PRICE_TYPES = [
  "subscription",
  "lifetime",
] as const satisfies readonly PriceType[];

/**
 * Supported billing intervals for native subscription prices.
 */
export const NATIVE_BILLING_INTERVALS = [
  "month",
  "year",
] as const satisfies readonly BillingInterval[];

/**
 * Native runtime platform used to select the active billing catalog.
 */
export type NativePaymentPlatform = "ios" | "android";

/**
 * Top-level native payments configuration.
 */
export type NativePaymentsConfig = {
  enabled?: boolean;
  ios?: AppNativePaymentsPlatformConfig;
  android?: AppNativePaymentsPlatformConfig;
};

/**
 * Normalized native price after validation.
 */
export type NormalizedNativePrice = {
  id: string;
  planId: string;
  provider: NativePaymentProviderKey;
  providerPriceId: string;
  currency: string;
  amountCents: number;
  priceType: PriceType;
  interval: BillingInterval | null;
  status: PlanStatus;
} & (
  | {
      priceType: "subscription";
      interval: BillingInterval;
    }
  | {
      priceType: "lifetime";
      interval: null;
    }
);

/**
 * Normalized native plan after validation.
 */
export type NormalizedNativePlan = {
  id: string;
  status: PlanStatus;
  prices: NormalizedNativePrice[];
};

export type NormalizedNativeCatalogPriceMatch = {
  platform: NativePaymentPlatform;
  plan: NormalizedNativePlan;
  price: NormalizedNativePrice;
};

function toNormalizedNativePrice(
  price: ReturnType<
    typeof normalizePlanPricingConfig<NativePaymentProviderKey, PriceType, BillingInterval>
  >[number]["prices"][number],
): NormalizedNativePrice {
  if (price.priceType === "subscription") {
    return {
      ...price,
      priceType: "subscription",
      interval: price.interval as BillingInterval,
    };
  }

  return {
    ...price,
    priceType: "lifetime",
    interval: null,
  };
}

function buildMembershipCatalogIndex(input: MembershipCatalogConfig) {
  const planById = new Map<string, NormalizedMembershipPlan>();
  const priceByKey = new Map<string, NormalizedMembershipPrice>();

  for (const plan of normalizeMembershipCatalogConfig(input)) {
    planById.set(plan.id, plan);
    for (const price of plan.prices) {
      priceByKey.set(`${plan.id}:${price.id}`, price);
    }
  }

  return { planById, priceByKey };
}

function getMembershipPlan(planById: Map<string, NormalizedMembershipPlan>, planId: string) {
  const plan = planById.get(planId);
  if (!plan) {
    throw new Error(`[native payments] Unknown membership plan "${planId}".`);
  }
  return plan;
}

function getMembershipPrice(
  priceByKey: Map<string, NormalizedMembershipPrice>,
  planId: string,
  priceId: string,
) {
  const price = priceByKey.get(`${planId}:${priceId}`);
  if (!price) {
    throw new Error(`[native payments] Unknown membership price "${planId}:${priceId}".`);
  }
  return price;
}

function resolveAdapterStatus(
  membershipStatus: PlanStatus,
  adapterStatus: PlanStatus | undefined,
): PlanStatus {
  return membershipStatus === "archived" ? "archived" : (adapterStatus ?? membershipStatus);
}

function assertNativePriceSemantics(
  price: NativePriceConfig,
  membershipPrice: NormalizedMembershipPrice,
) {
  if (price.priceType !== membershipPrice.priceType) {
    throw new Error(
      `[native payments] priceType mismatch for "${membershipPrice.planId}:${membershipPrice.id}". Expected "${membershipPrice.priceType}" from Membership Catalog, received "${price.priceType}".`,
    );
  }

  const interval = price.priceType === "subscription" ? (price.interval ?? null) : null;
  if (interval !== membershipPrice.interval) {
    throw new Error(
      `[native payments] interval mismatch for "${membershipPrice.planId}:${membershipPrice.id}". Expected "${membershipPrice.interval}" from Membership Catalog, received "${interval}".`,
    );
  }
}

function selectNativeProviderPlans(
  platformConfig: AppNativePaymentsPlatformConfig,
  membershipPlans: Map<string, NormalizedMembershipPlan>,
  membershipPrices: Map<string, NormalizedMembershipPrice>,
): PricingConfigPlan<NativePaymentProviderKey, PriceType, BillingInterval>[] {
  return platformConfig.plans.map((plan) => {
    const membershipPlan = getMembershipPlan(membershipPlans, plan.id);

    return {
      id: plan.id,
      status: resolveAdapterStatus(membershipPlan.status, plan.status),
      prices: plan.prices?.map((price) => {
        const membershipPrice = getMembershipPrice(membershipPrices, plan.id, price.id);
        assertNativePriceSemantics(price, membershipPrice);

        return {
          id: price.id,
          provider: price.provider,
          providerPriceId: price.providerPriceId,
          currency: price.currency,
          amountCents: price.amountCents,
          priceType: membershipPrice.priceType,
          interval: membershipPrice.interval,
          status: resolveAdapterStatus(membershipPrice.status, price.status),
        };
      }),
    };
  });
}

function resolveNativePaymentsPlatformConfig(
  input: NativePaymentsConfig,
  platform: NativePaymentPlatform | null,
) {
  if (!platform) {
    return undefined;
  }

  return input[platform];
}

/**
 * Validate and normalize the active platform native payments configuration.
 */
export function normalizeNativePaymentsConfig(
  input: NativePaymentsConfig,
  platform: NativePaymentPlatform | null,
  membershipCatalog: MembershipCatalogConfig = membershipCatalogConfig,
): NormalizedNativePlan[] {
  const platformConfig = resolveNativePaymentsPlatformConfig(input, platform);

  if (!platform) {
    return [];
  }

  if (!platformConfig) {
    throw new Error(`[native payments] Missing ${platform} payments config.`);
  }

  const membershipIndex = buildMembershipCatalogIndex(membershipCatalog);
  const normalizedPlans = normalizePlanPricingConfig({
    plans: selectNativeProviderPlans(
      platformConfig,
      membershipIndex.planById,
      membershipIndex.priceByKey,
    ),
    supportedProviders: ["revenuecat"] as const,
    supportedPriceTypes: NATIVE_PRICE_TYPES,
    supportedIntervals: NATIVE_BILLING_INTERVALS,
    subscriptionPriceType: "subscription",
    lifetimePriceType: "lifetime",
    errorPrefix: "[native payments]",
  });
  const typedPlans: NormalizedNativePlan[] = normalizedPlans.map((plan) => ({
    ...plan,
    prices: plan.prices.map(toNormalizedNativePrice),
  }));

  return typedPlans;
}

export function listNormalizedNativePlansByPlatform(
  input: NativePaymentsConfig,
  membershipCatalog: MembershipCatalogConfig = membershipCatalogConfig,
) {
  return {
    ios: input.ios ? normalizeNativePaymentsConfig(input, "ios", membershipCatalog) : [],
    android: input.android
      ? normalizeNativePaymentsConfig(input, "android", membershipCatalog)
      : [],
  } satisfies Record<NativePaymentPlatform, NormalizedNativePlan[]>;
}

export function findNativePriceByProviderPriceId(
  input: NativePaymentsConfig,
  providerPriceId: string,
  membershipCatalog: MembershipCatalogConfig = membershipCatalogConfig,
): NormalizedNativeCatalogPriceMatch | null {
  const catalogs = listNormalizedNativePlansByPlatform(input, membershipCatalog);

  for (const platform of ["ios", "android"] as const) {
    for (const plan of catalogs[platform]) {
      const price = plan.prices.find((item) => item.providerPriceId === providerPriceId);
      if (!price) {
        continue;
      }

      return {
        platform,
        plan,
        price,
      };
    }
  }

  return null;
}

const DEFAULT_NATIVE_PAYMENTS_CONFIG: {
  enabled: boolean;
  provider: NativePaymentProviderKey;
  ios?: AppNativePaymentsPlatformConfig;
  android?: AppNativePaymentsPlatformConfig;
} = {
  enabled: false,
  provider: "revenuecat",
};

function resolveNativePaymentsConfig(): {
  enabled?: boolean;
  provider: NativePaymentProviderKey;
  ios?: AppNativePaymentsPlatformConfig;
  android?: AppNativePaymentsPlatformConfig;
} {
  const paymentsConfig = resolveNativeCommonConfig().payments;

  if (!paymentsConfig) {
    return DEFAULT_NATIVE_PAYMENTS_CONFIG;
  }

  return {
    enabled: paymentsConfig.enabled,
    provider: paymentsConfig.provider,
    ios: paymentsConfig.ios,
    android: paymentsConfig.android,
  };
}

const resolvedConfig = resolveNativePaymentsConfig();

/**
 * Typed native payments config loaded from app config.
 */
export const nativePaymentsConfig: NativePaymentsConfig = {
  enabled: resolvedConfig.enabled,
  ios: resolvedConfig.ios,
  android: resolvedConfig.android,
};

/**
 * Indicates whether native payments integration is enabled.
 */
export const isNativePaymentsEnabled = resolvedConfig.enabled;

/**
 * Default native payment provider used when one is not specified.
 */
export const DEFAULT_NATIVE_PAYMENT_PROVIDER: NativePaymentProviderKey = resolvedConfig.provider;
