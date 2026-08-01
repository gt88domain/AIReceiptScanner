import { MEMBERSHIP_TIER_RANK, resolveCommonConfig } from "@repo/app-config";
import type { getPaymentService } from "@/payments";

export type CapabilityUser = { userId: string };
type PaymentService = ReturnType<typeof getPaymentService>;

/**
 * Resolves product feature access from server-owned billing records.
 * Unknown capabilities deny by default so a typo cannot grant access.
 */
export function createCapabilityService(payments: Pick<PaymentService, "getBillingStatus">) {
  const requirements = resolveCommonConfig().featureCapabilities;

  async function can(user: CapabilityUser, capability: string) {
    const requirement = requirements[capability];
    if (!requirement) return false;

    const billingStatus = await payments.getBillingStatus(user);
    return (
      MEMBERSHIP_TIER_RANK[billingStatus.currentEntitlement.tier] >=
      MEMBERSHIP_TIER_RANK[requirement.minimumTier]
    );
  }

  return { can };
}
