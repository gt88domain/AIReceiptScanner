import { ORPCError } from "@orpc/server";

type PaymentOperationErrorCode =
  | "CHECKOUT_CREATION_FAILED"
  | "CREDIT_CHECKOUT_CREATION_FAILED"
  | "BILLING_PORTAL_CREATION_FAILED"
  | "SUBSCRIPTION_UPGRADE_FAILED";

/** Converts provider failures into a stable, non-sensitive client response. */
export function createPaymentOperationError(code: PaymentOperationErrorCode, error: unknown) {
  const traceId = crypto.randomUUID();
  console.error("Payment operation failed", {
    code,
    error: error instanceof Error ? error.message : "Unknown error",
    traceId,
  });

  return new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Payment service is temporarily unavailable. Please try again.",
    data: { code, traceId },
  });
}
