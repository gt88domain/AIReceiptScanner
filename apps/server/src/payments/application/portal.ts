import type { Database } from "@/db";
import { findBillingCustomer } from "../infrastructure/repositories/billing-store";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import type { CreatePortalServiceInput } from "./types";

export async function createPortalSession(db: Database, input: CreatePortalServiceInput) {
  const billingStatus = await getBillingStatus(db, input.user);
  const requestedProvider = input.provider ?? billingStatus.billingProvider;
  if (!billingStatus.canManageBilling || requestedProvider !== "stripe") {
    throw new Error("Current billing provider does not support customer portal sessions");
  }

  const providerKey = resolvePaymentProviderKey(requestedProvider);
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
