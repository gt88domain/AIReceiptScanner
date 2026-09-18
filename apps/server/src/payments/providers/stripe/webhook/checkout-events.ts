import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { completeCreditOrderPurchase, markCreditOrderStatus } from "@/credits";
import type { Database } from "@/db";
import { billingCheckoutSession } from "@/db/schema/payments";
import { NonRetryableWebhookError } from "../../../application/webhook-observability";
import type { DbLike } from "../../../infrastructure/repositories/billing-store";
import {
  applyBillingPurchaseEvent,
  insertBillingSubscriptionIfMissing,
  upsertBillingCustomer,
} from "../../../infrastructure/repositories/billing-store";
import type { BillingUser } from "../../../public/types";
import { reconcileActivatedPriceWithExistingSubscriptions } from "../../shared/activated-price-effects";
import { resolveUserFromMetadata } from "./owner-resolver";
import { assertStripePurchaseMatchesCatalog } from "./purchase-validation";

/**
 * Handles checkout.session.completed and persists checkout, subscription, and purchase state.
 */
export async function handleStripeCheckoutCompleted(
  db: Database,
  session: Stripe.Checkout.Session,
  providerEventAt: Date,
  providerEventId: string,
) {
  const metadata = session.metadata ?? {};
  const [storedCheckoutSession] = await db
    .select({
      userId: billingCheckoutSession.userId,
      planId: billingCheckoutSession.planId,
      priceId: billingCheckoutSession.priceId,
    })
    .from(billingCheckoutSession)
    .where(
      and(
        eq(billingCheckoutSession.provider, "stripe"),
        eq(billingCheckoutSession.providerSessionId, session.id),
      ),
    )
    .limit(1);

  const user = await resolveUserFromMetadata(db, {
    metadata,
    providerCustomerId: typeof session.customer === "string" ? session.customer : undefined,
  });

  const resolvedUser =
    user ?? (storedCheckoutSession ? { userId: storedCheckoutSession.userId } : null);

  if (!resolvedUser) {
    console.error("Stripe checkout completed missing user metadata", {
      providerSessionId: session.id,
      metadata,
      storedCheckoutSession,
    });
    return;
  }

  if (metadata.kind === "credit_purchase") {
    const creditPackageId = metadata.creditPackageId;
    const creditOrderId = metadata.creditOrderId;
    const providerPaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    const isPaymentCompleted =
      session.mode === "payment" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    if (!creditPackageId || !creditOrderId || !isPaymentCompleted) {
      return;
    }

    const providerCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (providerCustomerId) {
      await upsertBillingCustomer(db, {
        user: resolvedUser,
        provider: "stripe",
        providerCustomerId,
        email: session.customer_details?.email ?? session.customer_email ?? null,
      });
    }

    await db
      .update(billingCheckoutSession)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        and(
          eq(billingCheckoutSession.provider, "stripe"),
          eq(billingCheckoutSession.providerSessionId, session.id),
        ),
      );

    // Credit package checkouts write only to the immutable order and ledger, never live config.
    await completeCreditOrderPurchase(db, {
      orderId: creditOrderId,
      sourceProvider: "stripe",
      sourceId: providerPaymentIntentId ?? `checkout_session:${session.id}`,
      providerSessionId: session.id,
      providerPaymentId: providerPaymentIntentId ?? null,
      providerAmountCents: session.amount_total,
      providerCurrency: session.currency,
      metadata: {
        checkoutSessionId: session.id,
        paymentIntentId: providerPaymentIntentId ?? null,
      },
    });
    return;
  }

  const planId = metadata.planId ?? storedCheckoutSession?.planId;
  const priceId = metadata.priceId ?? storedCheckoutSession?.priceId;
  if (!planId || !priceId) {
    console.error("Stripe checkout completed missing plan or price metadata", {
      providerSessionId: session.id,
      metadata,
      storedCheckoutSession,
    });
    return;
  }

  const providerPaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const isPaymentCompleted =
    session.mode === "payment" &&
    (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  if (session.mode === "payment" && isPaymentCompleted && !providerPaymentIntentId) {
    throw new NonRetryableWebhookError(
      "LIFETIME_CHECKOUT_WITHOUT_PAYMENT_INTENT_REQUIRES_MANUAL_REVIEW",
    );
  }

  const now = new Date();
  const providerCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  /**
   * D1 rejects SQL BEGIN/SAVEPOINT in this path, so writes are applied sequentially.
   */
  if (providerCustomerId) {
    await upsertBillingCustomer(db, {
      user: resolvedUser,
      provider: "stripe",
      providerCustomerId,
      email: session.customer_details?.email ?? session.customer_email ?? null,
    });
  }

  await db
    .update(billingCheckoutSession)
    .set({ status: "completed", updatedAt: now })
    .where(
      and(
        eq(billingCheckoutSession.provider, "stripe"),
        eq(billingCheckoutSession.providerSessionId, session.id),
      ),
    );

  const providerSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (session.mode === "subscription" && providerSubscriptionId) {
    await insertSubscriptionPlaceholderFromCheckout(db, {
      user: resolvedUser,
      providerSubscriptionId,
      providerCustomerId: providerCustomerId ?? "",
      planId,
      priceId,
    });
  }

  if (session.mode === "payment" && providerPaymentIntentId) {
    await upsertPurchaseFromCheckout(db, {
      user: resolvedUser,
      providerPaymentIntentId,
      planId,
      priceId,
      paid: isPaymentCompleted,
      amountCents: session.amount_total,
      currency: session.currency,
      providerEventAt,
      providerEventId,
    });
  }
}

/**
 * Marks asynchronous checkout as completed once payment is confirmed.
 */
export async function handleStripeCheckoutAsyncPaymentSucceeded(
  db: Database,
  session: Stripe.Checkout.Session,
  _providerEventAt: Date,
) {
  const metadata = session.metadata ?? {};
  if (metadata.kind === "credit_purchase" && metadata.creditOrderId) {
    const providerPaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    await completeCreditOrderPurchase(db, {
      orderId: metadata.creditOrderId,
      sourceProvider: "stripe",
      sourceId: providerPaymentIntentId ?? `checkout_session:${session.id}`,
      providerSessionId: session.id,
      providerPaymentId: providerPaymentIntentId ?? null,
      providerAmountCents: session.amount_total,
      providerCurrency: session.currency,
      metadata: {
        checkoutSessionId: session.id,
        paymentIntentId: providerPaymentIntentId ?? null,
      },
    });
    return;
  }

  const now = new Date();
  await db
    .update(billingCheckoutSession)
    .set({ status: "completed", updatedAt: now })
    .where(
      and(
        eq(billingCheckoutSession.provider, "stripe"),
        eq(billingCheckoutSession.providerSessionId, session.id),
      ),
    );
}

/**
 * Marks asynchronous checkout as expired when payment fails.
 */
export async function handleStripeCheckoutAsyncPaymentFailed(
  db: Database,
  session: Stripe.Checkout.Session,
  _providerEventAt: Date,
) {
  const metadata = session.metadata ?? {};
  if (metadata.kind === "credit_purchase" && metadata.creditOrderId) {
    const providerPaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    await markCreditOrderStatus(db, {
      orderId: metadata.creditOrderId,
      status: "failed",
      providerPaymentId: providerPaymentIntentId ?? null,
    });
    return;
  }

  const now = new Date();
  await db
    .update(billingCheckoutSession)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(billingCheckoutSession.provider, "stripe"),
        eq(billingCheckoutSession.providerSessionId, session.id),
      ),
    );
}

/**
 * Marks checkout session as expired when Stripe closes it without payment.
 */
export async function handleStripeCheckoutExpired(
  db: Database,
  session: Stripe.Checkout.Session,
  _providerEventAt: Date,
) {
  const metadata = session.metadata ?? {};
  if (metadata.kind === "credit_purchase" && metadata.creditOrderId) {
    await markCreditOrderStatus(db, {
      orderId: metadata.creditOrderId,
      status: "expired",
    });
    return;
  }

  const now = new Date();
  await db
    .update(billingCheckoutSession)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(billingCheckoutSession.provider, "stripe"),
        eq(billingCheckoutSession.providerSessionId, session.id),
      ),
    );
}

/**
 * Creates a local subscription placeholder without overwriting lifecycle events.
 */
async function insertSubscriptionPlaceholderFromCheckout(
  db: DbLike,
  input: {
    user: BillingUser;
    providerSubscriptionId: string;
    providerCustomerId: string;
    planId: string;
    priceId: string;
  },
) {
  await insertBillingSubscriptionIfMissing(db, {
    userId: input.user.userId,
    provider: "stripe",
    providerSubscriptionId: input.providerSubscriptionId,
    providerCustomerId: input.providerCustomerId,
    planId: input.planId,
    priceId: input.priceId,
    status: "incomplete",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    startedAt: null,
    endedAt: null,
  });
}

/**
 * Creates or updates purchase rows for one-time checkout sessions.
 */
async function upsertPurchaseFromCheckout(
  db: DbLike,
  input: {
    user: BillingUser;
    providerPaymentIntentId: string;
    planId: string;
    priceId: string;
    paid: boolean;
    amountCents: number | null;
    currency: string | null;
    providerEventAt: Date;
    providerEventId: string;
  },
) {
  if (input.paid) {
    assertStripePurchaseMatchesCatalog({
      providerResourceId: input.providerPaymentIntentId,
      planId: input.planId,
      priceId: input.priceId,
      amountCents: input.amountCents,
      currency: input.currency,
    });
  }

  const outcome = await applyBillingPurchaseEvent(db, {
    userId: input.user.userId,
    provider: "stripe",
    providerPaymentIntentId: input.providerPaymentIntentId,
    planId: input.planId,
    priceId: input.priceId,
    status: input.paid ? "succeeded" : "pending",
    paidAt: input.paid ? input.providerEventAt : null,
    providerEventAt: input.providerEventAt,
    providerEventId: input.providerEventId,
  });

  if (outcome !== "stale" && input.paid) {
    await reconcileActivatedPriceWithExistingSubscriptions(db, input.user, input.priceId);
  }
}
