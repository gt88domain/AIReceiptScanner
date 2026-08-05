import { env } from "cloudflare:workers";
import { ORPCError } from "@orpc/server";
import { getCheckoutDecisionReasonFromError } from "@repo/app-config/payments/web-policy";
import { z } from "zod";
import type { Context } from "@/lib/context";
import { requirePaymentService } from "@/lib/payment-access";
import { protectedBillingProcedure } from "@/lib/orpc";
import { createPaymentOperationError } from "@/lib/payment-operation-error";
import { providerEnum } from "@/payments/public/schemas";

/**
 * Schema for validating checkout session creation requests
 * Contains all parameters needed to initiate a payment flow
 */
const trustedWebsiteUrl = z.url().refine(
  (value) => {
    try {
      return new URL(value).origin === new URL(env.WEBSITE_URL).origin;
    } catch {
      return false;
    }
  },
  { message: "Redirect URL must use the configured website origin" },
);

const createCheckoutInputSchema = z.object({
  planId: z.string(), // Plan being purchased
  priceId: z.string(), // Specific price option selected
  successUrl: trustedWebsiteUrl, // Where to redirect after successful payment
  cancelUrl: trustedWebsiteUrl, // Where to redirect if payment is canceled
  provider: providerEnum.optional(), // Force specific payment provider (optional)
});

/**
 * Schema for validating customer portal session creation requests
 * Used to allow customers to manage their existing subscriptions
 */
const createPortalInputSchema = z.object({
  returnUrl: trustedWebsiteUrl, // Where to redirect after portal session
  provider: providerEnum.optional(), // Specific payment provider (optional)
});

/**
 * Schema for validating in-app subscription upgrade requests.
 */
const upgradeSubscriptionInputSchema = z.object({
  planId: z.string(), // Target plan to upgrade into
  priceId: z.string(), // Target subscription price
  provider: providerEnum.optional(), // Force specific payment provider (optional)
});

/**
 * Resolves current billing user from request context.
 *
 * @param context - Request context containing authenticated session.
 * @returns Current user identifier.
 * @throws ORPCError when session is missing.
 */
function resolveBillingUser(context: Context): { userId: string } {
  const userId = context.session?.user.id;
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: context.t("errors.unauthorized"),
    });
  }

  return { userId };
}

/**
 * Web-only payment action endpoints.
 */
export const paymentsRouter = {
  /**
   * Creates a checkout session to initiate payment for a specific plan and price
   * Returns a URL that redirects the user to the payment provider's checkout page
   */
  createCheckoutSession: protectedBillingProcedure
    .input(createCheckoutInputSchema)
    .output(
      z.object({
        url: z.url(), // Checkout URL to redirect user to
      }),
    )
    .handler(async ({ context, input }) => {
      const user = resolveBillingUser(context);
      try {
        const session = await requirePaymentService(context).createCheckoutSession({
          user,
          planId: input.planId,
          priceId: input.priceId,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          provider: input.provider,
          customerEmail: context.session?.user.email, // Pre-fill customer email
        });
        return { url: session.url };
      } catch (error) {
        const reason = getCheckoutDecisionReasonFromError(error);
        if (reason) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Checkout decision blocked",
            data: { reason },
          });
        }
        throw createPaymentOperationError("CHECKOUT_CREATION_FAILED", error);
      }
    }),

  /**
   * Creates a customer portal session for subscription management
   * Returns a URL that redirects the user to manage their existing subscriptions
   * (cancel, update payment method, view invoices, etc.)
   */
  createPortalSession: protectedBillingProcedure
    .input(createPortalInputSchema)
    .output(
      z.object({
        url: z.url(), // Portal URL to redirect user to
      }),
    )
    .handler(async ({ context, input }) => {
      const user = resolveBillingUser(context);
      try {
        const session = await requirePaymentService(context).createPortalSession({
          user,
          returnUrl: input.returnUrl,
          provider: input.provider,
        });
        return { url: session.url };
      } catch (error) {
        throw createPaymentOperationError("BILLING_PORTAL_CREATION_FAILED", error);
      }
    }),

  /**
   * Upgrades an active subscription in-app without redirecting to provider portal.
   * This keeps upgrade-only guardrails and blocks reverse operations.
   */
  upgradeSubscription: protectedBillingProcedure
    .input(upgradeSubscriptionInputSchema)
    .output(
      z.object({
        ok: z.boolean(),
      }),
    )
    .handler(async ({ context, input }) => {
      const user = resolveBillingUser(context);
      try {
        await requirePaymentService(context).upgradeSubscription({
          user,
          planId: input.planId,
          priceId: input.priceId,
          provider: input.provider,
        });
        return { ok: true };
      } catch (error) {
        const reason = getCheckoutDecisionReasonFromError(error);
        if (reason) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Upgrade decision blocked",
            data: { reason },
          });
        }

        throw createPaymentOperationError("SUBSCRIPTION_UPGRADE_FAILED", error);
      }
    }),
};
