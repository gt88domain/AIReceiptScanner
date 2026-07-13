import { ACTIVE_SUBSCRIPTION_STATUSES, type NormalizedPlan } from "@repo/app-config/payments/web";
import { SUPPORTED_WEB_PAYMENT_PROVIDERS, type ServerPaymentProviderKey } from "@repo/app-config";
import type { CheckoutDecisionReason } from "@repo/app-config/membership";
import { toNullable } from "@repo/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import {
  billingCheckoutSession,
  billingEvent,
  billingPurchase,
  billingSubscription,
} from "@/db/schema/payments";
import {
  findBillingPlanById,
  findBillingPriceById,
  findBillingPriceForRecord,
  findPlanById,
  findPriceById,
  listConfiguredPlans,
} from "../domain/plan-catalog";
import { evaluateCheckoutDecision, resolveCurrentEntitlement } from "../domain/policy";
import {
  findBillingCustomer,
  hasTrialConsumingSubscriptionHistory,
} from "../infrastructure/repositories/billing-store";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { handleCreemEvent } from "../providers/creem/webhook/handle-event";
import { handleRevenueCatEvent } from "../providers/revenuecat/webhook/handle-event";
import { handleStripeEvent } from "../providers/stripe/webhook/handle-event";
import { handleWaffoEvent } from "../providers/waffo/webhook/handle-event";
import type { BillingUser } from "../public/types";
import type { BillingStatus } from "../public/schemas";

/**
 * Parameters for creating a checkout session.
 */
type CreateCheckoutServiceInput = {
  /** Billing user that initiates checkout. */
  user: BillingUser;
  /** Target plan identifier. */
  planId: string;
  /** Target price identifier. */
  priceId: string;
  /** Redirect URL after successful checkout. */
  successUrl: string;
  /** Redirect URL when checkout is canceled. */
  cancelUrl: string;
  /** Optional provider override. */
  provider?: ServerPaymentProviderKey;
  /** Optional customer email used by the provider. */
  customerEmail?: string | null;
};

/**
 * Parameters for creating a customer portal session.
 */
type CreatePortalServiceInput = {
  /** Billing user that manages an existing subscription. */
  user: BillingUser;
  /** Redirect URL after leaving provider portal. */
  returnUrl: string;
  /** Optional provider override. */
  provider?: ServerPaymentProviderKey;
};

/**
 * Parameters for upgrading an existing subscription in-app.
 */
type UpgradeSubscriptionServiceInput = {
  /** Billing user that upgrades an existing subscription. */
  user: BillingUser;
  /** Target plan identifier. */
  planId: string;
  /** Target price identifier. */
  priceId: string;
  /** Optional provider override. */
  provider?: ServerPaymentProviderKey;
};

/**
 * Parameters for processing provider webhook payloads.
 */
type HandleWebhookInput = {
  /** Provider that sent the webhook payload. */
  provider: ServerPaymentProviderKey;
  /** Optional provider signature header. */
  signature?: string | null;
  /** Raw webhook payload body. */
  rawBody: string;
};

/**
 * Error thrown when checkout decision denies or reroutes a request.
 */
type CheckoutDecisionBlockedError = Error & {
  checkoutDecisionReason: CheckoutDecisionReason;
};

type BillingStatusSubscriptionRecord = typeof billingSubscription.$inferSelect;

type BillingStatusPurchaseRecord = typeof billingPurchase.$inferSelect;

/**
 * Creates a typed error carrying checkout decision reason for API mapping.
 */
function createCheckoutDecisionBlockedError(
  reason: CheckoutDecisionReason,
): CheckoutDecisionBlockedError {
  const error = new Error("Checkout decision blocked") as CheckoutDecisionBlockedError;
  error.checkoutDecisionReason = reason;
  return error;
}

/**
 * Creates the payment application service bound to a database instance.
 *
 * @param db - Database client.
 * @returns Payment service methods.
 */
export function createPaymentService(db: Database) {
  return {
    listPlans: () => listPlans(db),
    getBillingStatus: (user: BillingUser) => getBillingStatus(db, user),
    createCheckoutSession: (input: CreateCheckoutServiceInput) => createCheckoutSession(db, input),
    upgradeSubscription: (input: UpgradeSubscriptionServiceInput) => upgradeSubscription(db, input),
    createPortalSession: (input: CreatePortalServiceInput) => createPortalSession(db, input),
    handleWebhookEvent: (input: HandleWebhookInput) => handleWebhookEvent(db, input),
  };
}

/**
 * Lists all active plans and active prices.
 *
 * @returns Active plan catalog.
 */
async function listPlans(_db: Database): Promise<NormalizedPlan[]> {
  return listConfiguredPlans();
}

/**
 * Computes billing status for one billing user.
 *
 * @param db - Database client.
 * @param user - Billing user.
 * @returns Resolved billing status.
 */
async function getBillingStatus(db: Database, user: BillingUser): Promise<BillingStatus> {
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

    if (plan) {
      activePlan = { id: plan.id };
    }

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
    {
      tier: currentEntitlement.tier,
      source: currentEntitlement.source,
    },
    activePlan,
    activePrice,
  );
  let activePurchase = findActivePurchaseForCurrentEntitlement(
    purchases,
    {
      tier: currentEntitlement.tier,
      source: currentEntitlement.source,
    },
    activePlan,
    activePrice,
  );
  // After the winning record is known, prefer its provider catalog so native-only
  // prices such as RevenueCat weekly subscriptions do not fall back to web metadata.
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
      {
        tier: currentEntitlement.tier,
        source: currentEntitlement.source,
      },
      activePlan,
      activePrice,
    );
    activePurchase = findActivePurchaseForCurrentEntitlement(
      purchases,
      {
        tier: currentEntitlement.tier,
        source: currentEntitlement.source,
      },
      activePlan,
      activePrice,
    );
  }

  const billingProvider =
    currentEntitlement.source === "subscription"
      ? (activeSubscription?.provider ?? null)
      : currentEntitlement.source === "lifetime"
        ? (activePurchase?.provider ?? null)
        : null;

  const canManageBilling =
    (currentEntitlement.source === "subscription" || currentEntitlement.source === "lifetime") &&
    billingProvider !== null &&
    (SUPPORTED_WEB_PAYMENT_PROVIDERS as readonly ServerPaymentProviderKey[]).includes(
      billingProvider,
    );

  const billingStatus = {
    userId: user.userId,
    billingProvider,
    canManageBilling,
    activePlan,
    activePrice,
    currentEntitlement: {
      tier: currentEntitlement.tier,
      source: currentEntitlement.source,
    },
    hasActiveSubscription,
    subscription: toNullable(activeSubscription),
    lifetimePurchase: toNullable(activePurchase),
  } satisfies BillingStatus;

  return billingStatus;
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

/**
 * Creates a checkout session and records the local checkout request.
 *
 * @param db - Database client.
 * @param input - Checkout input.
 * @returns Provider checkout session.
 */
async function createCheckoutSession(db: Database, input: CreateCheckoutServiceInput) {
  const now = new Date();
  const localCheckoutSessionId = crypto.randomUUID();

  // ── 1. Validate that the target plan and price exist and are active ──
  const plan = findPlanById(input.planId);
  if (!plan || plan.status !== "active") {
    throw new Error("Plan not available");
  }

  const price = findPriceById(input.priceId);
  if (!price || price.planId !== plan.id || price.status !== "active") {
    throw new Error("Price not available");
  }
  // If the caller specifies a provider, ensure it matches the price's configured provider
  if (input.provider && price.provider !== input.provider) {
    throw new Error("Price provider mismatch");
  }

  // ── 2. Resolve the payment provider ──────────────────────────────────
  // Use the caller-specified provider if given, otherwise fall back to the price's provider
  const resolvedProvider = price.provider;
  const resolvedProviderKey = resolvePaymentProviderKey(input.provider ?? resolvedProvider);

  // ── 3. Evaluate whether this checkout is allowed based on the user's current entitlement ──
  // Fetch the user's current billing status (tier, source, active subscriptions, etc.)
  const billingStatus = await getBillingStatus(db, input.user);
  // Compare current tier against the target tier to decide:
  //   "checkout" (allow new purchase) / "upgrade" (same-provider tier upgrade) / "deny" (block)
  const checkoutDecision = evaluateCheckoutDecision({
    currentEntitlement: {
      tier: billingStatus.currentEntitlement.tier,
      source: billingStatus.currentEntitlement.source,
      planId: billingStatus.activePlan?.id ?? null,
      priceId: billingStatus.activePrice?.id ?? null,
    },
    targetPrice: {
      priceType: price.priceType,
      interval: price.interval ?? null,
    },
  });

  // ── 4. Handle cross-provider subscription upgrades ───────────────────
  // Example: user has a monthly subscription on RevenueCat and now wants to buy yearly via Stripe.
  // The decision engine returns "upgrade" (valid tier upgrade), but since the providers differ,
  // we cannot use the in-app upgrade flow. Instead, allow it as a fresh checkout session.
  // The lower-tier subscription will be auto-canceled at period end when the webhook fires.
  const isCrossProviderSubscriptionUpgrade =
    checkoutDecision.action === "upgrade" &&
    billingStatus.billingProvider !== null &&
    billingStatus.billingProvider !== resolvedProviderKey;

  // Only "checkout" and cross-provider upgrades proceed; everything else is blocked.
  // Same-provider "upgrade" should go through upgradeSubscription() instead.
  if (checkoutDecision.action !== "checkout" && !isCrossProviderSubscriptionUpgrade) {
    throw createCheckoutDecisionBlockedError(checkoutDecision.reason);
  }

  const resolvedProviderClient = getPaymentProvider(resolvedProviderKey);

  // ── 5. Look up existing billing customer ─────────────────────────────
  // Reuse the existing provider customer ID to avoid creating duplicate customers on Stripe
  const existingCustomer = await findBillingCustomer(db, {
    userId: input.user.userId,
    provider: resolvedProviderKey,
  });

  // ── 6. Trial abuse prevention ────────────────────────────────────────
  // Stripe supports disabling the trial per checkout request, so returning users fall back to a
  // paid subscription checkout. Creem trial behavior is controlled on the provider product, so
  // the app only suppresses repeat trials for Stripe where per-checkout control exists.
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

  // ── 7. Build metadata embedded into the checkout session ─────────────
  // The webhook handler uses these fields to associate incoming events with internal users and prices
  const metadata = {
    checkoutSessionId: localCheckoutSessionId,
    userId: input.user.userId,
    planId: plan.id,
    priceId: price.id,
    provider: resolvedProviderKey,
  };

  // ── 8. Create the checkout session via the provider SDK ──────────────
  const session = await resolvedProviderClient.createCheckoutSession({
    // "subscription" for recurring plans, "payment" for one-time lifetime purchases
    mode: price.priceType === "subscription" ? "subscription" : "payment",
    lineItems: [{ priceId: price.providerPriceId, quantity: 1 }],
    currency: price.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    metadata,
    trialDays: resolvedTrialDays,
    // Reuse existing customer ID so Stripe doesn't create a duplicate customer
    ...(existingCustomer?.providerCustomerId
      ? { customerId: existingCustomer.providerCustomerId }
      : {}),
    // Pre-fill customer email; prefer the email stored in billing_customer
    ...((existingCustomer?.email ?? input.customerEmail)
      ? { customerEmail: existingCustomer?.email ?? input.customerEmail! }
      : {}),
  });

  // ── 9. Record the checkout session locally for audit trail ───────────
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

/**
 * Upgrades an active subscription to a higher subscription tier in-app.
 *
 * @param db - Database client.
 * @param input - Upgrade input payload.
 */
async function upgradeSubscription(db: Database, input: UpgradeSubscriptionServiceInput) {
  const now = new Date();
  const plan = findPlanById(input.planId);
  if (!plan || plan.status !== "active") {
    throw new Error("Plan not available");
  }

  const price = findPriceById(input.priceId);
  if (!price || price.planId !== plan.id || price.status !== "active") {
    throw new Error("Price not available");
  }
  if (price.priceType !== "subscription") {
    throw new Error("Only subscription prices can be upgraded");
  }
  if (input.provider && price.provider !== input.provider) {
    throw new Error("Price provider mismatch");
  }

  const billingStatus = await getBillingStatus(db, input.user);
  const checkoutDecision = evaluateCheckoutDecision({
    currentEntitlement: {
      tier: billingStatus.currentEntitlement.tier,
      source: billingStatus.currentEntitlement.source,
      planId: billingStatus.activePlan?.id ?? null,
      priceId: billingStatus.activePrice?.id ?? null,
    },
    targetPrice: {
      priceType: price.priceType,
      interval: price.interval ?? null,
    },
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

  if (!subscription) {
    throw new Error("Active subscription not found");
  }

  await provider.updateSubscriptionPlan({
    subscriptionId: subscription.providerSubscriptionId,
    targetPriceId: price.providerPriceId,
  });

  await db
    .update(billingSubscription)
    .set({
      planId: plan.id,
      priceId: price.id,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    })
    .where(eq(billingSubscription.id, subscription.id));
}

/**
 * Creates a customer portal session for an existing billing customer.
 *
 * @param db - Database client.
 * @param input - Portal input.
 * @returns Provider portal session.
 */
async function createPortalSession(db: Database, input: CreatePortalServiceInput) {
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

  if (!customer) {
    throw new Error("Customer not found");
  }

  return provider.createPortalSession({
    customerId: customer.providerCustomerId,
    returnUrl: input.returnUrl,
  });
}

/**
 * Parses, deduplicates, stores, and dispatches webhook events.
 *
 * @param db - Database client.
 * @param input - Webhook payload input.
 * @returns Webhook receipt metadata.
 */
async function handleWebhookEvent(db: Database, input: HandleWebhookInput) {
  const provider = getPaymentProvider(input.provider);
  const parsed = await provider.parseWebhookEvent({
    signature: input.signature,
    rawBody: input.rawBody,
  });

  // Persist the event in a `pending` state before dispatching. On conflict, look up the
  // existing row: if it was already marked `processed`, treat this as a duplicate delivery;
  // otherwise a prior attempt failed and we must re-run the handler.
  //
  // D1 does not support interactive transactions across separate statements, so we cannot
  // wrap insert+dispatch+mark in a rollback-capable block. Instead we rely on:
  //   1. Provider-side retry when the webhook route responds non-2xx (thrown errors bubble up).
  //   2. Idempotent handlers — each provider's upserts compare `providerEventAt` before writing.
  //   3. The processing_status flag — only `processed` rows short-circuit as duplicates.
  const inserted = await db
    .insert(billingEvent)
    .values({
      id: crypto.randomUUID(),
      provider: input.provider,
      providerEventId: parsed.providerEventId,
      eventType: parsed.type,
      processedAt: parsed.createdAt,
      payloadJson: JSON.stringify({
        provider: input.provider,
        providerEventId: parsed.providerEventId,
        eventType: parsed.type,
        createdAt: parsed.createdAt.toISOString(),
      }),
      processingStatus: "pending",
    })
    .onConflictDoNothing({
      target: [billingEvent.provider, billingEvent.providerEventId],
    })
    .returning({ id: billingEvent.id });

  let eventRowId: string;
  if (inserted.length > 0) {
    eventRowId = inserted[0]!.id;
  } else {
    const [existing] = await db
      .select({
        id: billingEvent.id,
        processingStatus: billingEvent.processingStatus,
      })
      .from(billingEvent)
      .where(
        and(
          eq(billingEvent.provider, input.provider),
          eq(billingEvent.providerEventId, parsed.providerEventId),
        ),
      )
      .limit(1);

    if (!existing) {
      // Reachable only if another writer deleted the row between our insert and select.
      throw new Error(
        `Billing event lookup failed after insert conflict for ${input.provider}:${parsed.providerEventId}`,
      );
    }

    if (existing.processingStatus === "processed") {
      return { received: true, duplicate: true };
    }

    // existing.processingStatus === "pending" — a previous delivery's handler failed or is
    // still running concurrently. Re-run the handler; idempotent upserts make this safe.
    eventRowId = existing.id;
  }

  switch (input.provider) {
    case "stripe":
      await handleStripeEvent(db, parsed.payload);
      break;
    case "creem":
      await handleCreemEvent(db, parsed.payload);
      break;
    case "waffo":
      await handleWaffoEvent(db, parsed.payload);
      break;
    case "revenuecat":
      await handleRevenueCatEvent(db, parsed.payload);
      break;
  }

  await db
    .update(billingEvent)
    .set({ processingStatus: "processed" })
    .where(eq(billingEvent.id, eventRowId));

  return { received: true, duplicate: false };
}
