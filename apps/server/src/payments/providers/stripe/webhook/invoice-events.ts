import type Stripe from "stripe";
import type { Database } from "@/db";
import { retrieveStripeSubscription } from "../provider";
import { handleStripeSubscription } from "./subscription-events";

export async function handleStripeInvoicePaid(
  db: Database,
  invoice: Stripe.Invoice,
  providerEventAt: Date,
  providerEventId: string,
) {
  await syncSubscriptionFromInvoice(db, invoice, providerEventAt, providerEventId);
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
  await syncSubscriptionFromInvoice(db, invoice, providerEventAt, providerEventId);
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
  await syncSubscriptionFromInvoice(db, invoice, providerEventAt, providerEventId);
}

/**
 * Invoices trigger a refresh but never infer subscription status, price or period.
 * Use the complete Stripe Subscription snapshot and the same guarded writer as
 * subscription webhooks. Provider failures propagate to the durable inbox retry.
 */
async function syncSubscriptionFromInvoice(
  db: Database,
  invoice: Stripe.Invoice,
  providerEventAt: Date,
  providerEventId: string,
) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) return;
  const providerSubscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  if (!providerSubscriptionId) return;

  const subscription = await retrieveStripeSubscription(providerSubscriptionId);
  await handleStripeSubscription(db, subscription, providerEventAt, providerEventId);
}
