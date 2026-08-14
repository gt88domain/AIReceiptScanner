import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Context } from "@/lib/context";
import { creditOrder } from "@/db/schema/credits";
import { billingPurchase, billingSubscription } from "@/db/schema/payments";
import { desc, eq } from "drizzle-orm";
import { requirePaymentService } from "@/lib/payment-access";
import { billingProcedure, protectedBillingProcedure } from "@/lib/orpc";
import { billingStatusSchema, planSchema, purchaseHistorySchema } from "@/payments/public/schemas";

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

  listPurchaseHistory: protectedBillingProcedure
    .output(purchaseHistorySchema)
    .handler(async ({ context }) => {
      const user = resolveBillingUser(context);
      const [subscriptions, memberships, credits] = await Promise.all([
        context.db
          .select({
            provider: billingSubscription.provider,
            planId: billingSubscription.planId,
            status: billingSubscription.status,
            createdAt: billingSubscription.createdAt,
            completedAt: billingSubscription.startedAt,
          })
          .from(billingSubscription)
          .where(eq(billingSubscription.userId, user.userId))
          .orderBy(desc(billingSubscription.createdAt)),
        context.db
          .select({
            provider: billingPurchase.provider,
            planId: billingPurchase.planId,
            status: billingPurchase.status,
            createdAt: billingPurchase.createdAt,
            completedAt: billingPurchase.paidAt,
          })
          .from(billingPurchase)
          .where(eq(billingPurchase.userId, user.userId))
          .orderBy(desc(billingPurchase.createdAt)),
        context.db
          .select({
            provider: creditOrder.provider,
            packageId: creditOrder.packageId,
            status: creditOrder.status,
            amountCents: creditOrder.amountCents,
            currency: creditOrder.currency,
            createdAt: creditOrder.createdAt,
          })
          .from(creditOrder)
          .where(eq(creditOrder.userId, user.userId))
          .orderBy(desc(creditOrder.createdAt)),
      ]);

      return [
        ...subscriptions.map((record) => ({
          type: "subscription" as const,
          label: record.planId,
          provider: record.provider,
          status: record.status,
          amountCents: null,
          currency: null,
          createdAt: record.createdAt,
          completedAt: record.completedAt,
        })),
        ...memberships.map((record) => ({
          type: "membership" as const,
          label: record.planId,
          provider: record.provider,
          status: record.status,
          amountCents: null,
          currency: null,
          createdAt: record.createdAt,
          completedAt: record.completedAt,
        })),
        ...credits.map((record) => ({
          type: "credits" as const,
          label: record.packageId,
          provider: record.provider,
          status: record.status,
          amountCents: record.amountCents,
          currency: record.currency,
          createdAt: record.createdAt,
          completedAt: record.status === "completed" ? record.createdAt : null,
        })),
      ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    }),
};
