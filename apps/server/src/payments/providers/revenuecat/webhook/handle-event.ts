import { and, eq } from "drizzle-orm";
import {
  markCreditOrderRefunded,
  recordNativeCreditOrderPurchase,
  revokeCreditPurchase,
} from "@/credits";
import { findConfiguredNativeCreditPackageByProviderProductId } from "@/credits/application/internal";
import type { Database } from "@/db";
import { billingCustomer, billingPurchase, billingSubscription } from "@/db/schema/payments";
import {
  findNativePriceByProviderPriceId,
  nativePaymentsConfig,
} from "@repo/app-config/payments/native";
import {
  upsertBillingPurchaseIfNewer,
  upsertBillingSubscriptionIfNewer,
} from "@/payments/infrastructure/repositories/billing-store";
import { NonRetryableWebhookError } from "@/payments/application/webhook-observability";
import { reconcileActivatedPriceWithExistingSubscriptions } from "../../shared/activated-price-effects";
import type { RevenueCatWebhookEnvelope, RevenueCatWebhookEvent } from "../types";
import { shouldIgnoreRevenueCatEvent } from "./event-filter";
import { shouldSyncRevenueCatBillingState } from "./state-sync";
import {
  markRevenueCatIdentitiesTransferred,
  recordRevenueCatIdentities,
  resolveKnownRevenueCatUserId,
} from "./identity";

function resolveRevenueCatSubscriptionStatus(event: RevenueCatWebhookEvent) {
  const expirationAt =
    typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;
  const isExpired = expirationAt !== null && expirationAt.getTime() <= Date.now();

  if (event.type === "EXPIRATION" || isExpired) {
    return "canceled";
  }

  if (event.period_type === "TRIAL") {
    return "trialing";
  }

  return "active";
}

function shouldSetCancelAtPeriodEnd(event: RevenueCatWebhookEvent) {
  switch (event.type) {
    case "CANCELLATION":
      return true;
    case "UNCANCELLATION":
    case "RENEWAL":
    case "INITIAL_PURCHASE":
    case "PRODUCT_CHANGE":
      return false;
    default:
      return false;
  }
}

async function upsertRevenueCatCustomer(db: Database, userId: string, providerCustomerId: string) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(billingCustomer)
    .where(and(eq(billingCustomer.userId, userId), eq(billingCustomer.provider, "revenuecat")))
    .limit(1);

  if (!existing) {
    await db.insert(billingCustomer).values({
      id: crypto.randomUUID(),
      userId,
      provider: "revenuecat",
      providerCustomerId,
      email: null,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await db
    .update(billingCustomer)
    .set({
      providerCustomerId,
      updatedAt: now,
    })
    .where(eq(billingCustomer.id, existing.id));
}

async function upsertRevenueCatSubscription(
  db: Database,
  input: {
    userId: string;
    event: RevenueCatWebhookEvent;
    planId: string;
    priceId: string;
  },
) {
  const providerSubscriptionId = input.event.original_transaction_id ?? input.event.transaction_id;

  if (!providerSubscriptionId) {
    return;
  }

  // Convert provider event timestamp
  const providerEventAt = new Date(input.event.event_timestamp_ms);

  const startedAt =
    typeof input.event.purchased_at_ms === "number" ? new Date(input.event.purchased_at_ms) : null;
  const currentPeriodEnd =
    typeof input.event.expiration_at_ms === "number"
      ? new Date(input.event.expiration_at_ms)
      : null;
  const endedAt = input.event.type === "EXPIRATION" && currentPeriodEnd ? currentPeriodEnd : null;

  return Boolean(
    await upsertBillingSubscriptionIfNewer(db, {
      userId: input.userId,
      provider: "revenuecat",
      providerSubscriptionId,
      providerCustomerId: input.userId,
      planId: input.planId,
      priceId: input.priceId,
      status: resolveRevenueCatSubscriptionStatus(input.event),
      currentPeriodEnd,
      cancelAtPeriodEnd: shouldSetCancelAtPeriodEnd(input.event),
      startedAt,
      endedAt,
      providerEventAt,
      providerEventId: input.event.id,
    }),
  );
}

async function upsertRevenueCatPurchase(
  db: Database,
  input: {
    userId: string;
    event: RevenueCatWebhookEvent;
    planId: string;
    priceId: string;
  },
) {
  const providerPaymentIntentId = input.event.transaction_id ?? input.event.original_transaction_id;

  if (!providerPaymentIntentId) {
    return;
  }

  // Convert provider event timestamp
  const providerEventAt = new Date(input.event.event_timestamp_ms);

  const paidAt =
    typeof input.event.purchased_at_ms === "number" ? new Date(input.event.purchased_at_ms) : null;
  const status =
    input.event.type === "CANCELLATION" || input.event.type === "EXPIRATION"
      ? "refunded"
      : "succeeded";

  return Boolean(
    await upsertBillingPurchaseIfNewer(db, {
      userId: input.userId,
      provider: "revenuecat",
      providerPaymentIntentId,
      planId: input.planId,
      priceId: input.priceId,
      status,
      paidAt,
      providerEventAt,
      providerEventId: input.event.id,
    }),
  );
}

export async function handleRevenueCatEvent(db: Database, payload: unknown) {
  const event = (payload as RevenueCatWebhookEnvelope).event;
  if (!event) {
    return;
  }

  if (shouldIgnoreRevenueCatEvent(event)) {
    return;
  }

  if (event.type === "TRANSFER") {
    const fromAppUserIds = event.transferred_from ?? [];
    const toAppUserIds = event.transferred_to ?? [];
    const [fromUserId, toUserId] = await Promise.all([
      resolveKnownRevenueCatUserId(db, fromAppUserIds),
      resolveKnownRevenueCatUserId(db, toAppUserIds),
    ]);

    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      console.error("RevenueCat transfer has ambiguous or unknown account identities", {
        eventId: event.id,
        fromAppUserIds,
        toAppUserIds,
      });
      return;
    }

    await db.batch([
      db
        .update(billingSubscription)
        .set({ userId: toUserId, updatedAt: new Date() })
        .where(
          and(
            eq(billingSubscription.provider, "revenuecat"),
            eq(billingSubscription.userId, fromUserId),
          ),
        ),
      db
        .update(billingPurchase)
        .set({ userId: toUserId, updatedAt: new Date() })
        .where(
          and(eq(billingPurchase.provider, "revenuecat"), eq(billingPurchase.userId, fromUserId)),
        ),
    ]);
    await Promise.all([
      markRevenueCatIdentitiesTransferred(db, {
        appUserIds: fromAppUserIds,
        transferEventId: event.id,
        userId: fromUserId,
      }),
      recordRevenueCatIdentities(db, { appUserIds: toAppUserIds, userId: toUserId }),
    ]);
    return;
  }

  const identityCandidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ];
  const userId = await resolveKnownRevenueCatUserId(db, identityCandidates);
  if (!userId) {
    console.error("RevenueCat webhook missing non-anonymous app user id", {
      eventId: event.id,
      type: event.type,
      productId: event.product_id,
      store: event.store,
      entitlementIds: event.entitlement_ids,
      appUserId: event.app_user_id,
      originalAppUserId: event.original_app_user_id,
      aliases: event.aliases,
    });
    return;
  }

  await recordRevenueCatIdentities(db, { appUserIds: identityCandidates, userId });

  // RevenueCat documents PRODUCT_CHANGE as informational only.
  // The active entitlement changes when the follow-up INITIAL_PURCHASE / RENEWAL arrives.
  if (!shouldSyncRevenueCatBillingState(event)) {
    return;
  }

  if (!event.product_id) {
    console.error("RevenueCat webhook missing product id", { eventId: event.id, type: event.type });
    return;
  }

  const mappedCreditPackage = findConfiguredNativeCreditPackageByProviderProductId(
    event.product_id,
  );
  if (mappedCreditPackage) {
    // Credit packages are consumable/non-renewing products and stay out of membership billing.
    const providerTransactionId = event.transaction_id ?? event.original_transaction_id;
    if (!providerTransactionId) {
      console.error("RevenueCat credit event missing transaction id", {
        eventId: event.id,
        type: event.type,
        productId: event.product_id,
        userId,
      });
      return;
    }

    if (event.type === "NON_RENEWING_PURCHASE") {
      await recordNativeCreditOrderPurchase(db, {
        user: { userId },
        packageId: mappedCreditPackage.package.id,
        platform: mappedCreditPackage.platform,
        sourceProvider: "revenuecat",
        sourceId: providerTransactionId,
        metadata: {
          eventId: event.id,
          platform: mappedCreditPackage.platform,
          productId: event.product_id,
          store: event.store ?? null,
        },
      });
      return;
    }

    if (event.type === "CANCELLATION") {
      // Refunds revoke only the remaining unspent credits from the original purchase.
      await revokeCreditPurchase(db, {
        user: { userId },
        originalSourceProvider: "revenuecat",
        originalSourceId: providerTransactionId,
        refundSourceId: event.id,
        metadata: {
          eventId: event.id,
          productId: event.product_id,
          cancelReason: event.cancel_reason ?? null,
        },
      });
      await markCreditOrderRefunded(db, {
        sourceProvider: "revenuecat",
        providerPaymentId: providerTransactionId,
      });
      return;
    }

    return;
  }

  const mappedPrice = findNativePriceByProviderPriceId(nativePaymentsConfig, event.product_id);
  if (!mappedPrice) {
    console.error("RevenueCat webhook missing native price mapping", {
      eventId: event.id,
      type: event.type,
      productId: event.product_id,
      newProductId: event.new_product_id,
      store: event.store,
      entitlementIds: event.entitlement_ids,
      userId,
    });
    return;
  }

  await upsertRevenueCatCustomer(db, userId, userId);

  if (mappedPrice.price.priceType === "lifetime") {
    const applied = await upsertRevenueCatPurchase(db, {
      userId,
      event,
      planId: mappedPrice.plan.id,
      priceId: mappedPrice.price.id,
    });
    if (applied) {
      await reconcileActivatedPriceWithExistingSubscriptions(db, { userId }, mappedPrice.price.id);
    }
    return;
  }

  if (event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT") {
    // RevenueCat documents this as a refund signal but also warns that renewal
    // can remain active. Keep it visible for an operator instead of guessing at
    // an automatic subscription state transition.
    throw new NonRetryableWebhookError("REVENUECAT_SUBSCRIPTION_REFUND_REQUIRES_MANUAL_REVIEW");
  }

  const applied = await upsertRevenueCatSubscription(db, {
    userId,
    event,
    planId: mappedPrice.plan.id,
    priceId: mappedPrice.price.id,
  });
  if (applied) {
    await reconcileActivatedPriceWithExistingSubscriptions(db, { userId }, mappedPrice.price.id);
  }
}
