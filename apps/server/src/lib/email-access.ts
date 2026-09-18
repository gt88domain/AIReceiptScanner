import { ORPCError } from "@orpc/server";
import type { EmailCapabilities } from "@repo/app-config";
import type { Context } from "./context";

/** Fails closed without exposing provider configuration or secrets. */
export function requireEmailService(
  context: Pick<Context, "email" | "runtimeConfig">,
  capability: keyof EmailCapabilities,
): NonNullable<Context["email"]> {
  if (!context.runtimeConfig.email.enabled || !context.email) {
    throw new ORPCError("NOT_FOUND", {
      message: "Email is disabled.",
      data: { code: "EMAIL_DISABLED" },
    });
  }
  if (!context.runtimeConfig.email.capabilities[capability]) {
    throw new ORPCError("NOT_FOUND", {
      message: "This email capability is disabled.",
      data: { code: "EMAIL_CAPABILITY_DISABLED" },
    });
  }
  return context.email;
}
