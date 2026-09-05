import { NonRetryableWebhookError } from "../../../application/webhook-observability";
import { findPriceById } from "../../../domain/plan-catalog";

/** Enforces the immutable catalog amount for successful one-time Stripe purchases. */
export function assertStripePurchaseMatchesCatalog(input: {
  providerResourceId: string;
  planId: string;
  priceId: string;
  amountCents: number | null;
  currency: string | null;
}) {
  const price = findPriceById(input.priceId);
  if (!price || price.planId !== input.planId || price.provider !== "stripe") {
    throw new NonRetryableWebhookError(
      `Stripe purchase ${input.providerResourceId} does not match the configured billing catalog.`,
    );
  }
  // Subscription invoices can contain prorations and discounts. One-time purchases cannot.
  if (price.priceType !== "lifetime") return;
  if (
    input.amountCents !== price.amountCents ||
    input.currency?.toLowerCase() !== price.currency.toLowerCase()
  ) {
    throw new NonRetryableWebhookError(
      `Stripe purchase ${input.providerResourceId} amount or currency does not match price ${input.priceId}.`,
    );
  }
}
