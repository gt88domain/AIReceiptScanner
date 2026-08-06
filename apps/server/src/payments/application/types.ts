import type { ServerPaymentProviderKey } from "@repo/app-config";
import type { CheckoutDecisionReason } from "@repo/app-config/membership";
import type { BillingUser } from "../public/types";

export type CreateCheckoutServiceInput = {
  user: BillingUser;
  planId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  provider?: ServerPaymentProviderKey;
  customerEmail?: string | null;
  operationId?: string;
};

export type CreatePortalServiceInput = {
  user: BillingUser;
  returnUrl: string;
  provider?: ServerPaymentProviderKey;
};

export type UpgradeSubscriptionServiceInput = {
  user: BillingUser;
  planId: string;
  priceId: string;
  provider?: ServerPaymentProviderKey;
  operationId?: string;
};

export type HandleWebhookInput = {
  provider: ServerPaymentProviderKey;
  signature?: string | null;
  rawBody: string;
};

export type CheckoutDecisionBlockedError = Error & {
  checkoutDecisionReason: CheckoutDecisionReason;
};

export function createCheckoutDecisionBlockedError(
  reason: CheckoutDecisionReason,
): CheckoutDecisionBlockedError {
  const error = new Error("Checkout decision blocked") as CheckoutDecisionBlockedError;
  error.checkoutDecisionReason = reason;
  return error;
}
