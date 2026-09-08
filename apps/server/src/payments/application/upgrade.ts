import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { billingSubscription } from "@/db/schema/payments";
import { findPlanById, findPriceById, findPriceByProviderPriceId } from "../domain/plan-catalog";
import { evaluateCheckoutDecision } from "../domain/policy";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import {
  claimPaymentOperation,
  completePaymentOperation,
  createPaymentOperationRequest,
  failPaymentOperation,
  getOrCreatePaymentOperation,
  savePaymentOperationProviderSuccess,
} from "./payment-operation";
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

  const providerKey = resolvePaymentProviderKey(input.provider ?? price.provider);
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

  // v4 recovery could persist the provider price ID in the local priceId column.
  // Repair that known shape before policy evaluation so it cannot block every later upgrade.
  let currentPrice = subscription ? findPriceById(subscription.priceId) : undefined;
  if (subscription && !currentPrice) {
    const legacyPrice = findPriceByProviderPriceId(providerKey, subscription.priceId);
    if (legacyPrice && legacyPrice.planId === subscription.planId) {
      const repaired = await db
        .update(billingSubscription)
        .set({ priceId: legacyPrice.id, updatedAt: now })
        .where(
          and(
            eq(billingSubscription.id, subscription.id),
            eq(billingSubscription.priceId, subscription.priceId),
          ),
        )
        .returning({ id: billingSubscription.id });
      if (!repaired[0]) throw new Error("SUBSCRIPTION_LOCAL_STATE_DIVERGED");
      subscription.priceId = legacyPrice.id;
      currentPrice = legacyPrice;
    }
  }

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

  if (billingStatus.billingProvider !== providerKey) {
    throw new Error("Current subscription is managed by another billing provider");
  }
  const provider = getPaymentProvider(providerKey);
  if (!subscription) throw new Error("Active subscription not found");
  if (
    !currentPrice ||
    currentPrice.provider !== providerKey ||
    currentPrice.priceType !== "subscription"
  ) {
    throw new Error("Current subscription price is not available");
  }
  const operationId = input.operationId ?? crypto.randomUUID();
  const operationRequest = await createPaymentOperationRequest({
    provider: providerKey,
    subscriptionId: subscription.providerSubscriptionId,
    expectedCurrentPriceId: currentPrice.id,
    expectedCurrentProviderPriceId: currentPrice.providerPriceId,
    targetPlanId: plan.id,
    targetPriceId: price.id,
    targetProviderPriceId: price.providerPriceId,
  });
  const operation = await getOrCreatePaymentOperation(db, {
    userId: input.user.userId,
    provider: providerKey,
    operationType: "subscription_upgrade",
    operationId,
    ...operationRequest,
    idempotencyMode:
      provider.capabilities.subscriptionUpdateIdempotency === "native" ? "native" : "local_only",
    scopeKey: `subscription:${providerKey}:${subscription.providerSubscriptionId}`,
    relatedResourceType: "subscription",
    relatedResourceId: subscription.id,
  });
  if (operation.status === "completed") return;
  if (operation.status === "provider_succeeded") {
    await finalizeSubscriptionUpgrade(db, subscription.id, currentPrice.id, plan.id, price.id, now);
    await completePaymentOperation(db, operation.id, now);
    return;
  }
  const claim = await claimPaymentOperation(db, operation, now);
  if (!claim) throw new Error("SUBSCRIPTION_OPERATION_IN_PROGRESS");

  try {
    await provider.updateSubscriptionPlan({
      subscriptionId: subscription.providerSubscriptionId,
      currentPriceId: currentPrice.providerPriceId,
      targetPriceId: price.providerPriceId,
      idempotencyKey: claim.operation.operationKey,
    });
    await savePaymentOperationProviderSuccess(
      db,
      operation.id,
      claim.token,
      subscription.providerSubscriptionId,
      JSON.stringify({ version: 1, targetPriceId: price.id }),
      now,
    );
    await finalizeSubscriptionUpgrade(db, subscription.id, currentPrice.id, plan.id, price.id, now);
    await completePaymentOperation(db, operation.id, now);
  } catch (error) {
    await failPaymentOperation(
      db,
      operation.id,
      claim.token,
      error,
      operation.idempotencyMode === "local_only",
      now,
    );
    throw error;
  }
}

async function finalizeSubscriptionUpgrade(
  db: Database,
  subscriptionId: string,
  expectedPriceId: string,
  planId: string,
  targetPriceId: string,
  now: Date,
) {
  const [updated] = await db
    .update(billingSubscription)
    .set({ planId, priceId: targetPriceId, cancelAtPeriodEnd: false, updatedAt: now })
    .where(
      and(
        eq(billingSubscription.id, subscriptionId),
        eq(billingSubscription.priceId, expectedPriceId),
      ),
    )
    .returning({ id: billingSubscription.id });
  if (updated) return;
  const [current] = await db
    .select({ priceId: billingSubscription.priceId })
    .from(billingSubscription)
    .where(eq(billingSubscription.id, subscriptionId))
    .limit(1);
  if (current?.priceId === targetPriceId) return;
  throw new Error("SUBSCRIPTION_LOCAL_STATE_DIVERGED");
}
