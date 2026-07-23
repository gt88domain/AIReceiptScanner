import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { billingSubscription } from "@/db/schema/payments";
import { findPlanById, findPriceById } from "../domain/plan-catalog";
import { evaluateCheckoutDecision } from "../domain/policy";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import { createCheckoutDecisionBlockedError, type UpgradeSubscriptionServiceInput } from "./types";

export async function upgradeSubscription(db: Database, input: UpgradeSubscriptionServiceInput) {
  const now = new Date();
  const plan = findPlanById(input.planId);
  if (!plan || plan.status !== "active") throw new Error("Plan not available");
  const price = findPriceById(input.priceId);
  if (!price || price.planId !== plan.id || price.status !== "active") {
    throw new Error("Price not available");
  }
  if (price.priceType !== "subscription")
    throw new Error("Only subscription prices can be upgraded");
  if (input.provider && price.provider !== input.provider)
    throw new Error("Price provider mismatch");

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
  if (checkoutDecision.action !== "upgrade") {
    throw createCheckoutDecisionBlockedError(checkoutDecision.reason);
  }

  const providerKey = resolvePaymentProviderKey(input.provider ?? price.provider);
  if (billingStatus.billingProvider !== providerKey) {
    throw new Error("Current subscription is managed by another billing provider");
  }
  const provider = getPaymentProvider(providerKey);
  const [subscription] = await db
    .select()
    .from(billingSubscription)
    .where(
      and(
        eq(billingSubscription.userId, input.user.userId),
        eq(billingSubscription.provider, providerKey),
        inArray(billingSubscription.status, ["active", "trialing"]),
      ),
    )
    .orderBy(desc(billingSubscription.updatedAt))
    .limit(1);
  if (!subscription) throw new Error("Active subscription not found");
  const currentPrice = findPriceById(subscription.priceId);
  if (
    !currentPrice ||
    currentPrice.provider !== providerKey ||
    currentPrice.priceType !== "subscription"
  ) {
    throw new Error("Current subscription price is not available");
  }

  await provider.updateSubscriptionPlan({
    subscriptionId: subscription.providerSubscriptionId,
    currentPriceId: currentPrice.providerPriceId,
    targetPriceId: price.providerPriceId,
  });
  await db
    .update(billingSubscription)
    .set({ planId: plan.id, priceId: price.id, cancelAtPeriodEnd: false, updatedAt: now })
    .where(eq(billingSubscription.id, subscription.id));
}
