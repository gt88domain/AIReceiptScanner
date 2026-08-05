import { ORPCError } from "@orpc/server";
import type { Context } from "./context";

/** Fails closed before any payment-provider or billing-table access. */
export function requirePaymentService(
  context: Pick<Context, "payments">,
): NonNullable<Context["payments"]> {
  if (!context.payments) {
    throw new ORPCError("NOT_FOUND", {
      message: "Billing is disabled.",
      data: { code: "BILLING_DISABLED" },
    });
  }
  return context.payments;
}
