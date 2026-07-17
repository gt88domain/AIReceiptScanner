import type { Database } from "@/db";
import { billingCheckoutSession } from "@/db/schema/payments";
import { findPlanById, findPriceById } from "../domain/plan-catalog";
import { evaluateCheckoutDecision } from "../domain/policy";
import {
  findBillingCustomer,
  hasTrialConsumingSubscriptionHistory,
} from "../infrastructure/repositories/billing-store";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import { createCheckoutDecisionBlockedError, type CreateCheckoutServiceInput } from "./types";

export async function createCheckoutSession(db: Database, input: CreateCheckoutServiceInput) {
  const now = new Date();
  const localCheckoutSessionId = crypto.randomUUID();
  const plan = findPlanById(input.planId);
  if (!plan || plan.status !== "active") {
    throw new Error("Plan not available");
  }
  const price = findPriceById(input.priceId);
  if (!price || price.planId !== plan.id || price.status !== "active") {
    throw new Error("Price not available");
  }
  if (input.provider && price.provider !== input.provider) {
    throw new Error("Price provider mismatch");
  }

  const resolvedProvider = price.provider;
  const resolvedProviderKey = resolvePaymentProviderKey(input.provider ?? resolvedProvider);
  const billingStatus = await getBillingStatus(db, input.user);
  const checkoutDecision = evaluateCheckoutDecision({
    currentEntitlement: {
      tier: billingStatus.currentEntitlement.tier,
      source: billingStatus.currentEntitlement.source,
      planId: billingStatus.activePlan?.id ?? null,
      priceId: billingStatus.activePrice?.id ?? null,
    },
    targetPrice: { priceType: price.priceType, interval: price.interval ?? null },
  });
  const isCrossProviderSubscriptionUpgrade =
    checkoutDecision.action === "upgrade" &&
    billingStatus.billingProvider !== null &&
    billingStatus.billingProvider !== resolvedProviderKey;
  if (checkoutDecision.action !== "checkout" && !isCrossProviderSubscriptionUpgrade) {
    throw createCheckoutDecisionBlockedError(checkoutDecision.reason);
  }

  const provider = getPaymentProvider(resolvedProviderKey);
  const existingCustomer = await findBillingCustomer(db, {
    userId: input.user.userId,
    provider: resolvedProviderKey,
  });
  const hasConsumedTrial =
    price.priceType === "subscription" && price.trialDays
      ? await hasTrialConsumingSubscriptionHistory(db, {
          userId: input.user.userId,
          provider: resolvedProviderKey,
        })
      : false;
  const canApplyStripeTrial =
    resolvedProviderKey === "stripe" && price.priceType === "subscription" && price.trialDays;
  const resolvedTrialDays = canApplyStripeTrial && !hasConsumedTrial ? price.trialDays : null;

  const session = await provider.createCheckoutSession({
    mode: price.priceType === "subscription" ? "subscription" : "payment",
    lineItems: [{ priceId: price.providerPriceId, quantity: 1 }],
    currency: price.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    metadata: {
      checkoutSessionId: localCheckoutSessionId,
      userId: input.user.userId,
      planId: plan.id,
      priceId: price.id,
      provider: resolvedProviderKey,
    },
    trialDays: resolvedTrialDays,
    ...(existingCustomer?.providerCustomerId
      ? { customerId: existingCustomer.providerCustomerId }
      : {}),
    ...((existingCustomer?.email ?? input.customerEmail)
      ? { customerEmail: existingCustomer?.email ?? input.customerEmail! }
      : {}),
  });

  await db.insert(billingCheckoutSession).values({
    id: localCheckoutSessionId,
    userId: input.user.userId,
    provider: resolvedProviderKey,
    providerSessionId: session.providerSessionId,
    planId: plan.id,
    priceId: price.id,
    mode: price.priceType === "subscription" ? "subscription" : "payment",
    status: "created",
    expiresAt: session.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return session;
}
