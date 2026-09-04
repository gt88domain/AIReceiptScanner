import type Stripe from "stripe";
import type { Database } from "@/db";
import {
  findSubscriptionByProviderId,
  upsertBillingSubscriptionIfNewer,
} from "../../../infrastructure/repositories/billing-store";

export async function handleStripeInvoicePaid(
  db: Database,
  invoice: Stripe.Invoice,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updateSubscriptionFromInvoice(db, invoice, "active", providerEventAt, providerEventId);
}

/**
 * Handles invoice.payment_failed.
 */
export async function handleStripeInvoicePaymentFailed(
  db: Database,
  invoice: Stripe.Invoice,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updateSubscriptionFromInvoice(db, invoice, "past_due", providerEventAt, providerEventId);
}

/**
 * Handles invoice.marked_uncollectible.
 */
export async function handleStripeInvoiceMarkedUncollectible(
  db: Database,
  invoice: Stripe.Invoice,
  providerEventAt: Date,
  providerEventId: string,
) {
  await updateSubscriptionFromInvoice(db, invoice, "unpaid", providerEventAt, providerEventId);
}

/**
 * Updates local subscription rows from invoice lifecycle events.
 */
async function updateSubscriptionFromInvoice(
  db: Database,
  invoice: Stripe.Invoice,
  status: "active" | "past_due" | "unpaid",
  providerEventAt: Date,
  providerEventId: string,
) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) return;
  const providerSubscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  if (!providerSubscriptionId) return;

  const existing = await findSubscriptionByProviderId(db, "stripe", providerSubscriptionId);
  if (!existing || existing.status === "canceled") return;
  const linePeriodEnd = invoice.lines?.data?.at(0)?.period?.end;
  const currentPeriodEnd =
    typeof linePeriodEnd === "number" ? new Date(linePeriodEnd * 1000) : null;

  await upsertBillingSubscriptionIfNewer(db, {
    userId: existing.userId,
    provider: existing.provider,
    providerSubscriptionId: existing.providerSubscriptionId,
    providerCustomerId: existing.providerCustomerId,
    planId: existing.planId,
    priceId: existing.priceId,
    status,
    currentPeriodEnd: currentPeriodEnd ?? existing.currentPeriodEnd,
    cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
    startedAt: existing.startedAt,
    endedAt: existing.endedAt,
    providerEventAt,
    providerEventId,
  });
}
