import type { Database } from "@/db";
import { findBillingCustomer } from "../infrastructure/repositories/billing-store";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import type { CreatePortalServiceInput } from "./types";

export async function createPortalSession(db: Database, input: CreatePortalServiceInput) {
  const billingStatus = await getBillingStatus(db, input.user);
  if (!billingStatus.canManageBilling || billingStatus.billingProvider === null) {
    throw new Error("Current billing provider does not support customer portal sessions");
  }

  const providerKey = resolvePaymentProviderKey(input.provider ?? billingStatus.billingProvider);
  const provider = getPaymentProvider(providerKey);
  const customer = await findBillingCustomer(db, {
    userId: input.user.userId,
    provider: providerKey,
  });
  if (!customer) throw new Error("Customer not found");

  return provider.createPortalSession({
    customerId: customer.providerCustomerId,
    returnUrl: input.returnUrl,
  });
}
