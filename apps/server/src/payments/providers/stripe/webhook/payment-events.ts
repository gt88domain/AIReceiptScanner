import type Stripe from "stripe";
import {
  completeCreditOrderPurchase,
  markCreditOrderStatus,
  recordCreditPaymentDispute,
  revokeCreditPurchaseBySource,
} from "@/credits";
import type { Database } from "@/db";
import {
  findPurchaseByProviderIntent,
  upsertBillingPurchaseIfNewer,
} from "../../../infrastructure/repositories/billing-store";
import { NonRetryableWebhookError } from "../../../application/webhook-observability";
import { findPriceById } from "../../../domain/plan-catalog";
import { reconcileActivatedPriceWithExistingSubscriptions } from "../../shared/activated-price-effects";
import { resolveUserFromMetadata } from "./owner-resolver";

/**
 * Handles successful payment intents and ensures purchase records are updated.
 */
export async function handleStripePaymentIntentSucceeded(
  db: Database,
  paymentIntent: Stripe.PaymentIntent,
  providerEventAt: Date,
  providerEventId: string,
) {
  await upsertPurchaseFromPaymentIntent(db, {
    paymentIntent,
    status: "succeeded",
    paid: true,
    providerEventAt,
    providerEventId,
  });
}

/**
 * Handles failed payment intents.
 */
export async function handleStripePaymentIntentFailed(
  db: Database,
  paymentIntent: Stripe.PaymentIntent,
  providerEventAt: Date,
  providerEventId: string,
) {
  await upsertPurchaseFromPaymentIntent(db, {
    paymentIntent,
    status: "failed",
    paid: false,
    providerEventAt,
    providerEventId,
  });
}

/**
 * Handles canceled payment intents as failed payments in the local model.
 */
export async function handleStripePaymentIntentCanceled(
  db: Database,
  paymentIntent: Stripe.PaymentIntent,
  providerEventAt: Date,
  providerEventId: string,
) {
  await upsertPurchaseFromPaymentIntent(db, {
    paymentIntent,
    status: "failed",
    paid: false,
    providerEventAt,
    providerEventId,
  });
}

/**
 * Marks purchase rows as refunded when Stripe sends a full refund signal.
 */
export async function handleStripeChargeRefunded(
  db: Database,
  charge: Stripe.Charge,
  providerEventAt: Date,
  providerEventId: string,
) {
  if (charge.amount_refunded > 0 && charge.amount_refunded < charge.amount) {
    throw new NonRetryableWebhookError("PARTIAL_REFUND_REQUIRES_MANUAL_REVIEW");
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

  if (!paymentIntentId) {
    throw new NonRetryableWebhookError("REFUND_WITHOUT_PAYMENT_INTENT_REQUIRES_MANUAL_REVIEW");
  }

  const revokedCreditPurchase = await revokeCreditPurchaseBySource(db, {
    originalSourceProvider: "stripe",
    originalSourceId: paymentIntentId,
    refundSourceId: charge.id,
    metadata: {
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded,
    },
  });
  if (revokedCreditPurchase) {
    return;
  }

  const existing = await findPurchaseByProviderIntent(db, "stripe", paymentIntentId);
  if (!existing) {
    throw new NonRetryableWebhookError("SUBSCRIPTION_OR_UNKNOWN_REFUND_REQUIRES_MANUAL_REVIEW");
  }
  await upsertBillingPurchaseIfNewer(db, {
    userId: existing.userId,
    provider: existing.provider,
    providerPaymentIntentId: existing.providerPaymentIntentId,
    planId: existing.planId,
    priceId: existing.priceId,
    status: "refunded",
    paidAt: existing.paidAt,
    providerEventAt,
    providerEventId,
  });
}

/**
 * Handles charge.dispute.updated.
 */
export async function handleStripeChargeDisputeUpdated(
  db: Database,
  dispute: Stripe.Dispute,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updatePurchaseStatusFromDispute(db, dispute, providerEventAt, providerEventId);
}

/**
 * Handles charge.dispute.created.
 */
export async function handleStripeChargeDisputeCreated(
  db: Database,
  dispute: Stripe.Dispute,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updatePurchaseStatusFromDispute(db, dispute, providerEventAt, providerEventId);
}

/**
 * Handles charge.dispute.closed.
 */
export async function handleStripeChargeDisputeClosed(
  db: Database,
  dispute: Stripe.Dispute,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updatePurchaseStatusFromDispute(db, dispute, providerEventAt, providerEventId);
}

/**
 * Creates or updates local purchase records from payment intents.
 */
async function upsertPurchaseFromPaymentIntent(
  db: Database,
  input: {
    paymentIntent: Stripe.PaymentIntent;
    status: "succeeded" | "failed";
    paid: boolean;
    providerEventAt: Date;
    providerEventId: string;
  },
) {
  const paymentIntentId = input.paymentIntent.id;
  const existing = await findPurchaseByProviderIntent(db, "stripe", paymentIntentId);
  const metadata = input.paymentIntent.metadata ?? {};

  if (metadata.kind === "credit_purchase" && metadata.creditOrderId) {
    if (input.status === "succeeded") {
      await completeCreditOrderPurchase(db, {
        orderId: metadata.creditOrderId,
        sourceProvider: "stripe",
        sourceId: paymentIntentId,
        providerPaymentId: paymentIntentId,
        providerAmountCents: input.paymentIntent.amount_received,
        providerCurrency: input.paymentIntent.currency,
        metadata: {
          paymentIntentId,
        },
      });
    } else {
      await markCreditOrderStatus(db, {
        orderId: metadata.creditOrderId,
        status: "failed",
        providerPaymentId: paymentIntentId,
      });
    }
    return;
  }

  const recordedPlanId = metadata.planId ?? existing?.planId;
  const recordedPriceId = metadata.priceId ?? existing?.priceId;
  if (input.status === "succeeded" && recordedPlanId && recordedPriceId) {
    assertStripePurchaseMatchesCatalog(input.paymentIntent, recordedPlanId, recordedPriceId);
  }

  if (!existing) {
    if (metadata.kind === "credit_purchase") {
      console.error("Stripe credit payment skipped because it has no immutable credit order", {
        paymentIntentId,
      });
      return;
    }

    const user = await resolveUserFromMetadata(db, { metadata });
    const planId = metadata.planId;
    const priceId = metadata.priceId;

    if (!user || !planId || !priceId) {
      console.info("Stripe payment intent skipped because it has no billing metadata", {
        paymentIntentId,
        metadata,
      });
      return;
    }

    const applied = await upsertBillingPurchaseIfNewer(db, {
      userId: user.userId,
      provider: "stripe",
      providerPaymentIntentId: paymentIntentId,
      planId,
      priceId,
      status: input.status,
      paidAt: input.paid ? input.providerEventAt : null,
      providerEventAt: input.providerEventAt,
      providerEventId: input.providerEventId,
    });

    if (applied && input.status === "succeeded") {
      await reconcileActivatedPriceWithExistingSubscriptions(db, user, priceId);
    }
    return;
  }

  const applied = await upsertBillingPurchaseIfNewer(db, {
    userId: existing.userId,
    provider: existing.provider,
    providerPaymentIntentId: existing.providerPaymentIntentId,
    planId: existing.planId,
    priceId: existing.priceId,
    status: input.status,
    paidAt: input.paid ? input.providerEventAt : existing.paidAt,
    providerEventAt: input.providerEventAt,
    providerEventId: input.providerEventId,
  });

  if (applied && input.status === "succeeded") {
    await reconcileActivatedPriceWithExistingSubscriptions(
      db,
      { userId: existing.userId },
      existing.priceId,
    );
  }
}

function assertStripePurchaseMatchesCatalog(
  paymentIntent: Stripe.PaymentIntent,
  planId: string,
  priceId: string,
) {
  const price = findPriceById(priceId);
  if (!price || price.planId !== planId || price.provider !== "stripe") {
    throw new NonRetryableWebhookError(
      `Stripe purchase ${paymentIntent.id} does not match the configured billing catalog.`,
    );
  }
  // Subscription invoices can contain prorations and discounts. One-time purchases cannot.
  if (price.priceType !== "lifetime") return;
  if (
    paymentIntent.amount_received !== price.amountCents ||
    paymentIntent.currency.toLowerCase() !== price.currency.toLowerCase()
  ) {
    throw new NonRetryableWebhookError(
      `Stripe purchase ${paymentIntent.id} amount or currency does not match price ${priceId}.`,
    );
  }
}

/**
 * Maps dispute status to the local purchase status model.
 */
function mapDisputeStatusToPurchaseStatus(
  status: Stripe.Dispute.Status,
): "succeeded" | "failed" | "refunded" | null {
  switch (status) {
    case "won":
    case "warning_closed":
    case "prevented":
      return "succeeded";
    case "lost":
      return "failed";
    default:
      return null;
  }
}

/**
 * Updates purchase status from dispute payload.
 */
async function updatePurchaseStatusFromDispute(
  db: Database,
  dispute: Stripe.Dispute,
  providerEventAt: Date,
  providerEventId: string,
) {
  const paymentIntentRef = dispute.payment_intent;
  const paymentIntentId =
    typeof paymentIntentRef === "string" ? paymentIntentRef : paymentIntentRef?.id;
  if (!paymentIntentId) {
    throw new NonRetryableWebhookError("DISPUTE_WITHOUT_PAYMENT_INTENT_REQUIRES_MANUAL_REVIEW");
  }

  const creditDispute = await recordCreditPaymentDispute(db, {
    provider: "stripe",
    providerDisputeId: dispute.id,
    providerPaymentId: paymentIntentId,
    status: mapDisputeStatusToCreditDisputeStatus(dispute.status),
    amountCents: dispute.amount,
    currency: dispute.currency,
    providerEventAt,
    providerEventId,
  });

  const existingPurchase = await findPurchaseByProviderIntent(db, "stripe", paymentIntentId);
  if (!creditDispute && !existingPurchase) {
    throw new NonRetryableWebhookError("SUBSCRIPTION_OR_UNKNOWN_DISPUTE_REQUIRES_MANUAL_REVIEW");
  }

  const status = mapDisputeStatusToPurchaseStatus(dispute.status);
  if (!status) return;

  await updatePurchaseStatusByPaymentIntent(
    db,
    paymentIntentId,
    status,
    providerEventAt,
    providerEventId,
  );
}

function mapDisputeStatusToCreditDisputeStatus(
  status: Stripe.Dispute.Status,
): "open" | "won" | "lost" {
  switch (status) {
    case "won":
    case "warning_closed":
    case "prevented":
      return "won";
    case "lost":
      return "lost";
    default:
      return "open";
  }
}

/**
 * Applies purchase status updates by provider payment intent ID.
 */
async function updatePurchaseStatusByPaymentIntent(
  db: Database,
  providerPaymentIntentId: string,
  status: "succeeded" | "failed" | "refunded",
  providerEventAt: Date,
  providerEventId: string,
) {
  const existing = await findPurchaseByProviderIntent(db, "stripe", providerPaymentIntentId);
  if (!existing) return;
  if (existing.status === "refunded" && status !== "refunded") return;
  await upsertBillingPurchaseIfNewer(db, {
    userId: existing.userId,
    provider: existing.provider,
    providerPaymentIntentId: existing.providerPaymentIntentId,
    planId: existing.planId,
    priceId: existing.priceId,
    status,
    paidAt: existing.paidAt,
    providerEventAt,
    providerEventId,
  });
}
