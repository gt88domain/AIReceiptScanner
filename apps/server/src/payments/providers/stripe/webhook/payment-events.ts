import type Stripe from "stripe";
import {
  completeCreditOrderPurchase,
  grantCreditPackagePurchase,
  markCreditOrderRefunded,
  markCreditOrderStatus,
  revokeCreditPurchaseBySource,
} from "@/credits";
import type { Database } from "@/db";
import {
  findPurchaseByProviderIntent,
  upsertBillingPurchaseIfNewer,
} from "../../../infrastructure/repositories/billing-store";
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
  if (!charge.refunded && charge.amount_refunded < charge.amount) {
    return;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const revokedCreditPurchase = await revokeCreditPurchaseBySource(db, {
    originalSourceProvider: "stripe",
    originalSourceId: paymentIntentId,
    refundSourceId: charge.id,
    metadata: {
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded,
    },
  });
  const markedCreditOrder = await markCreditOrderRefunded(db, {
    sourceProvider: "stripe",
    providerPaymentId: paymentIntentId,
  });
  if (revokedCreditPurchase || markedCreditOrder) {
    return;
  }

  const existing = await findPurchaseByProviderIntent(db, "stripe", paymentIntentId);
  if (!existing) return;
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

  if (!existing) {
    if (metadata.kind === "credit_purchase") {
      // Standalone payment intent events may arrive without checkout completion ordering.
      if (input.status === "succeeded" && metadata.userId && metadata.creditPackageId) {
        await grantCreditPackagePurchase(db, {
          user: { userId: metadata.userId },
          packageId: metadata.creditPackageId,
          sourceProvider: "stripe",
          sourceId: paymentIntentId,
          metadata: {
            paymentIntentId,
          },
        });
      }
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
  if (!paymentIntentId) return;

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
