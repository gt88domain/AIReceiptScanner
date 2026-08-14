import { env } from "cloudflare:workers";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Context } from "@/lib/context";
import { requireCreditsService } from "@/lib/credits-access";
import { webCreditPurchaseProcedure } from "@/lib/orpc";
import { createPaymentOperationError } from "@/lib/payment-operation-error";
import { assertBackofficePreviewAllowsExternalActions } from "@/lib/backoffice-preview";

/** Web payment providers that can create credit package checkout sessions. */
const webCreditProviderEnum = z.enum(["stripe", "creem"]);

/** Input schema for starting a web credit package checkout session. */
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

const createCreditCheckoutInputSchema = z.object({
  packageId: z.string(),
  returnUrl: trustedWebsiteUrl,
  provider: webCreditProviderEnum.optional(),
  operationId: z.uuid().optional(),
});

/** Resolves the authenticated user for protected web credit endpoints. */
function resolveCreditUser(context: Context): { userId: string } {
  const userId = context.session?.user.id;
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: context.t("errors.unauthorized"),
    });
  }

  return { userId };
}

/** Web-only credit routes for checkout creation. */
export const webCreditsRouter = {
  createCheckoutSession: webCreditPurchaseProcedure
    .input(createCreditCheckoutInputSchema)
    .output(z.object({ url: z.url(), orderId: z.string() }))
    .handler(async ({ context, input }) => {
      assertBackofficePreviewAllowsExternalActions(context.env);
      const user = resolveCreditUser(context);
      try {
        const session = await requireCreditsService(context).createCheckoutSession({
          user,
          packageId: input.packageId,
          returnUrl: input.returnUrl,
          provider: input.provider,
          customerEmail: context.session?.user.email,
          operationId: input.operationId,
        });
        return { url: session.url, orderId: session.creditOrderId };
      } catch (error) {
        throw createPaymentOperationError("CREDIT_CHECKOUT_CREATION_FAILED", error);
      }
    }),
};
