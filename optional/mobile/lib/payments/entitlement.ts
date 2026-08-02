import { MEMBERSHIP_TIER_RANK, resolveMembershipTier } from "@repo/app-config/membership";
import type { NormalizedNativePlan } from "@repo/app-config/payments/native";
import type { CustomerInfo } from "react-native-purchases";
import type { ActivePlanPriceMatch, NativeEntitlementState } from "./types";

type EntitlementCandidate = {
  tierRank: number;
  planIndex: number;
  priceIndex: number;
  state: NativeEntitlementState;
};

export const EMPTY_NATIVE_ENTITLEMENT_STATE: NativeEntitlementState = {
  currentEntitlement: {
    tier: "free",
    source: "none",
    planId: null,
    priceId: null,
  },
  activePlan: null,
  activePrice: null,
  hasLifetime: false,
  hasActiveSubscription: false,
};

function hasAnyActiveRevenueCatEntitlement(customerInfo: CustomerInfo | null) {
  if (!customerInfo) {
    return false;
  }

  return (
    customerInfo.activeSubscriptions.length > 0 ||
    Object.keys(customerInfo.entitlements.active).length > 0
  );
}

function buildEntitlementCandidate(
  plans: NormalizedNativePlan[],
  match: ActivePlanPriceMatch,
): EntitlementCandidate | null {
  const planIndex = plans.findIndex((plan) => plan.id === match.planId);
  if (planIndex < 0) {
    return null;
  }

  const plan = plans[planIndex];
  const priceIndex = plan.prices.findIndex((price) => price.id === match.priceId);
  if (priceIndex < 0) {
    return null;
  }

  const price = plan.prices[priceIndex];
  const tier = resolveMembershipTier({
    priceType: price.priceType,
    interval: price.interval,
  });
  const source = price.priceType === "lifetime" ? "lifetime" : "subscription";

  return {
    tierRank: MEMBERSHIP_TIER_RANK[tier],
    planIndex,
    priceIndex,
    state: {
      currentEntitlement: {
        tier,
        source,
        planId: plan.id,
        priceId: price.id,
      },
      activePlan: {
        id: plan.id,
      },
      activePrice: {
        id: price.id,
        currency: price.currency,
        amountCents: price.amountCents,
        priceType: price.priceType,
        interval: price.interval,
      },
      hasLifetime: source === "lifetime",
      hasActiveSubscription: source === "subscription",
    },
  };
}

/** Resolves native entitlement state from RevenueCat and the active platform catalog. */
export function resolveNativeEntitlementState(input: {
  customerInfo: CustomerInfo | null;
  plans: NormalizedNativePlan[];
  activePlanPriceIds: ActivePlanPriceMatch[];
}): NativeEntitlementState {
  if (!hasAnyActiveRevenueCatEntitlement(input.customerInfo)) {
    return EMPTY_NATIVE_ENTITLEMENT_STATE;
  }

  const candidates = input.activePlanPriceIds
    .map((match) => buildEntitlementCandidate(input.plans, match))
    .filter((candidate): candidate is EntitlementCandidate => candidate !== null)
    .sort((candidateA, candidateB) => {
      if (candidateB.tierRank !== candidateA.tierRank) {
        return candidateB.tierRank - candidateA.tierRank;
      }

      if (candidateA.planIndex !== candidateB.planIndex) {
        return candidateA.planIndex - candidateB.planIndex;
      }

      return candidateA.priceIndex - candidateB.priceIndex;
    });

  return candidates[0]?.state ?? EMPTY_NATIVE_ENTITLEMENT_STATE;
}
