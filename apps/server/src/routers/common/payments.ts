import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Context } from "@/lib/context";
import { requirePaymentService } from "@/lib/payment-access";
import { billingProcedure, protectedBillingProcedure } from "@/lib/orpc";
import { billingStatusSchema, planSchema } from "@/payments/public/schemas";

function resolveBillingUser(context: Context): { userId: string } {
  const userId = context.session?.user.id;
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: context.t("errors.unauthorized"),
    });
  }

  return { userId };
}

export const commonPaymentsRouter = {
  listPlans: billingProcedure
    .output(z.array(planSchema))
    .handler(({ context }) => requirePaymentService(context).listPlans()),

  getBillingStatus: protectedBillingProcedure.output(billingStatusSchema).handler(({ context }) => {
    const user = resolveBillingUser(context);
    return requirePaymentService(context).getBillingStatus(user);
  }),
};
