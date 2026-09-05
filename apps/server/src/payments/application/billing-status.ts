import { ACTIVE_SUBSCRIPTION_STATUSES, type NormalizedPlan } from "@repo/app-config/payments/web";
import { toNullable } from "@repo/shared";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { billingPurchase, billingSubscription } from "@/db/schema/payments";
import { findBillingCustomer } from "../infrastructure/repositories/billing-store";
import {
  findBillingPlanById,
  findBillingPriceById,
  findBillingPriceForRecord,
  listConfiguredPlans,
} from "../domain/plan-catalog";
import { resolveCurrentEntitlement } from "../domain/policy";
import type { BillingStatus } from "../public/schemas";
import type { BillingUser } from "../public/types";

type BillingStatusSubscriptionRecord = typeof billingSubscription.$inferSelect;
type BillingStatusPurchaseRecord = typeof billingPurchase.$inferSelect;

export async function listPlans(): Promise<NormalizedPlan[]> {
  return listConfiguredPlans();
}

export async function getBillingStatus(db: Database, user: BillingUser): Promise<BillingStatus> {
  const subscriptions = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, user.userId))
    .orderBy(desc(billingSubscription.updatedAt));
  const purchases = await db
    .select()
    .from(billingPurchase)
    .where(and(eq(billingPurchase.userId, user.userId), eq(billingPurchase.status, "succeeded")))
    .orderBy(desc(billingPurchase.updatedAt));

  const hasActiveSubscription = subscriptions.some((item) =>
    ACTIVE_SUBSCRIPTION_STATUSES.has(item.status),
  );
  const currentEntitlement = resolveCurrentEntitlement({
    subscriptions,
    purchases,
    findPriceById: findBillingPriceById,
  });
  const { planId, priceId } = currentEntitlement;

  let activePlan: BillingStatus["activePlan"] = null;
  let activePrice: BillingStatus["activePrice"] = null;
  if (planId && priceId) {
    const plan = findBillingPlanById(planId);
    const price = findBillingPriceById(priceId);
    if (plan) activePlan = { id: plan.id };
    if (price) {
      activePrice = {
        id: price.id,
        currency: price.currency,
        amountCents: price.amountCents,
        priceType: price.priceType,
        interval: price.interval ?? null,
      };
    }
  }

  let activeSubscription = findActiveSubscriptionForCurrentEntitlement(
    subscriptions,
    { tier: currentEntitlement.tier, source: currentEntitlement.source },
    activePlan,
    activePrice,
  );
  let activePurchase = findActivePurchaseForCurrentEntitlement(
    purchases,
    { tier: currentEntitlement.tier, source: currentEntitlement.source },
    activePlan,
    activePrice,
  );
  const providerSpecificPrice =
    activeSubscription !== null
      ? findBillingPriceForRecord(activeSubscription)
      : activePurchase !== null
        ? findBillingPriceForRecord(activePurchase)
        : null;
  if (providerSpecificPrice) {
    activePrice = {
      id: providerSpecificPrice.id,
      currency: providerSpecificPrice.currency,
      amountCents: providerSpecificPrice.amountCents,
      priceType: providerSpecificPrice.priceType,
      interval: providerSpecificPrice.interval ?? null,
    };
    activeSubscription = findActiveSubscriptionForCurrentEntitlement(
      subscriptions,
      { tier: currentEntitlement.tier, source: currentEntitlement.source },
      activePlan,
      activePrice,
    );
    activePurchase = findActivePurchaseForCurrentEntitlement(
      purchases,
      { tier: currentEntitlement.tier, source: currentEntitlement.source },
      activePlan,
      activePrice,
    );
  }

  const entitlementProvider =
    currentEntitlement.source === "subscription"
      ? (activeSubscription?.provider ?? null)
      : currentEntitlement.source === "lifetime"
        ? (activePurchase?.provider ?? null)
        : null;
  // A customer must retain access to invoices and payment methods after entitlement ends.
  const stripeCustomer = await findBillingCustomer(db, { userId: user.userId, provider: "stripe" });
  // Keep a current native entitlement's provider intact: checkout/upgrade policy also uses it.
  const billingProvider = entitlementProvider ?? (stripeCustomer ? "stripe" : null);
  const canManageBilling = billingProvider === "stripe" && Boolean(stripeCustomer);

  return {
    userId: user.userId,
    billingProvider,
    canManageBilling,
    activePlan,
    activePrice,
    currentEntitlement: { tier: currentEntitlement.tier, source: currentEntitlement.source },
    hasActiveSubscription,
    subscription: toNullable(activeSubscription),
    lifetimePurchase: toNullable(activePurchase),
  } satisfies BillingStatus;
}

function findActiveSubscriptionForCurrentEntitlement(
  subscriptions: BillingStatusSubscriptionRecord[],
  currentEntitlement: BillingStatus["currentEntitlement"],
  activePlan: BillingStatus["activePlan"],
  activePrice: BillingStatus["activePrice"],
) {
  if (currentEntitlement.source !== "subscription" || !activePlan?.id || !activePrice?.id) {
    return null;
  }
  return (
    subscriptions.find(
      (item) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(item.status) &&
        item.planId === activePlan.id &&
        item.priceId === activePrice.id,
    ) ?? null
  );
}

function findActivePurchaseForCurrentEntitlement(
  purchases: BillingStatusPurchaseRecord[],
  currentEntitlement: BillingStatus["currentEntitlement"],
  activePlan: BillingStatus["activePlan"],
  activePrice: BillingStatus["activePrice"],
) {
  if (currentEntitlement.source !== "lifetime" || !activePlan?.id || !activePrice?.id) {
    return null;
  }
  return (
    purchases.find(
      (item) =>
        item.status === "succeeded" &&
        item.planId === activePlan.id &&
        item.priceId === activePrice.id,
    ) ?? null
  );
}
