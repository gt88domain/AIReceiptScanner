import { ORPCError } from "@orpc/server";
import type { Context } from "./context";

/** Fails closed before any credit-ledger access. */
export function requireCreditsService(
  context: Pick<Context, "credits">,
): NonNullable<Context["credits"]> {
  if (!context.credits) {
    throw new ORPCError("NOT_FOUND", {
      message: "Credits are disabled.",
      data: { code: "CREDITS_DISABLED" },
    });
  }
  return context.credits;
}
