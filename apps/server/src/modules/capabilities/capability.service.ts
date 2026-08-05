import { MEMBERSHIP_TIER_RANK, resolveCommonConfig, type MembershipTier } from "@repo/app-config";
import type { getPaymentService } from "@/payments";

export type CapabilityUser = { userId: string };
type PaymentService = ReturnType<typeof getPaymentService>;

export type EntitlementReader = {
  getEntitlement(user: CapabilityUser): Promise<{ tier: MembershipTier }>;
};

/** Commercial membership comes only from verified payment records. */
export function createPaymentEntitlementReader(
  payments: Pick<PaymentService, "getBillingStatus">,
): EntitlementReader {
  return {
    async getEntitlement(user) {
      const status = await payments.getBillingStatus(user);
      return { tier: status.currentEntitlement.tier };
    },
  };
}

/** No billing module means a real free-only entitlement policy, not a fake payment service. */
export function createFreeEntitlementReader(): EntitlementReader {
  return {
    async getEntitlement() {
      return { tier: "free" };
    },
  };
}

/**
 * Resolves product feature access from server-owned billing records.
 * Unknown capabilities deny by default so a typo cannot grant access.
 */
export function createCapabilityService(entitlements: EntitlementReader) {
  const requirements = resolveCommonConfig().featureCapabilities;

  async function can(user: CapabilityUser, capability: string) {
    const requirement = requirements[capability];
    if (!requirement) return false;

    const entitlement = await entitlements.getEntitlement(user);
    return MEMBERSHIP_TIER_RANK[entitlement.tier] >= MEMBERSHIP_TIER_RANK[requirement.minimumTier];
  }

  return { can };
}
