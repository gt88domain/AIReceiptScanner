import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Context } from "@/lib/context";
import { creditOrder } from "@/db/schema/credits";
import { billingPurchase, billingSubscription } from "@/db/schema/payments";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { requirePaymentService } from "@/lib/payment-access";
import { billingProcedure, protectedBillingProcedure } from "@/lib/orpc";
import {
  billingStatusSchema,
  planSchema,
  purchaseHistoryCursorSchema,
  purchaseHistorySchema,
} from "@/payments/public/schemas";

function resolveBillingUser(context: Context): { userId: string } {
  const userId = context.session?.user.id;
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: context.t("errors.unauthorized"),
    });
  }

  return { userId };
}

const purchaseHistoryInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
    cursor: purchaseHistoryCursorSchema.optional(),
  })
  .optional();

async function listPurchaseHistoryPage(
  context: Context,
  input: z.infer<typeof purchaseHistoryInputSchema>,
) {
  const user = resolveBillingUser(context);
  const limit = input?.limit ?? 50;
  const cursor = input?.cursor;
  const subscriptionCursor = cursor
    ? or(
        lt(billingSubscription.createdAt, cursor.createdAt),
        "subscription" < cursor.type
          ? eq(billingSubscription.createdAt, cursor.createdAt)
          : cursor.type === "subscription"
            ? and(
                eq(billingSubscription.createdAt, cursor.createdAt),
                lt(billingSubscription.id, cursor.id),
              )
            : undefined,
      )
    : undefined;
  const membershipCursor = cursor
    ? or(
        lt(billingPurchase.createdAt, cursor.createdAt),
        "membership" < cursor.type
          ? eq(billingPurchase.createdAt, cursor.createdAt)
          : cursor.type === "membership"
            ? and(
                eq(billingPurchase.createdAt, cursor.createdAt),
                lt(billingPurchase.id, cursor.id),
              )
            : undefined,
      )
    : undefined;
  const creditsCursor = cursor
    ? or(
        lt(creditOrder.createdAt, cursor.createdAt),
        "credits" < cursor.type
          ? eq(creditOrder.createdAt, cursor.createdAt)
          : cursor.type === "credits"
            ? and(eq(creditOrder.createdAt, cursor.createdAt), lt(creditOrder.id, cursor.id))
            : undefined,
      )
    : undefined;
  const [subscriptions, memberships, credits] = await Promise.all([
    context.db
      .select({
        id: billingSubscription.id,
        provider: billingSubscription.provider,
        planId: billingSubscription.planId,
        status: billingSubscription.status,
        createdAt: billingSubscription.createdAt,
        completedAt: billingSubscription.startedAt,
      })
      .from(billingSubscription)
      .where(and(eq(billingSubscription.userId, user.userId), subscriptionCursor))
      .orderBy(desc(billingSubscription.createdAt), desc(billingSubscription.id))
      .limit(limit + 1),
    context.db
      .select({
        id: billingPurchase.id,
        provider: billingPurchase.provider,
        planId: billingPurchase.planId,
        status: billingPurchase.status,
        createdAt: billingPurchase.createdAt,
        completedAt: billingPurchase.paidAt,
      })
      .from(billingPurchase)
      .where(and(eq(billingPurchase.userId, user.userId), membershipCursor))
      .orderBy(desc(billingPurchase.createdAt), desc(billingPurchase.id))
      .limit(limit + 1),
    context.db
      .select({
        id: creditOrder.id,
        provider: creditOrder.provider,
        packageId: creditOrder.packageId,
        status: creditOrder.status,
        amountCents: creditOrder.amountCents,
        currency: creditOrder.currency,
        createdAt: creditOrder.createdAt,
      })
      .from(creditOrder)
      .where(and(eq(creditOrder.userId, user.userId), creditsCursor))
      .orderBy(desc(creditOrder.createdAt), desc(creditOrder.id))
      .limit(limit + 1),
  ]);

  const history = [
    ...subscriptions.map((record) => ({
      id: record.id,
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
      id: record.id,
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
      id: record.id,
      type: "credits" as const,
      label: record.packageId,
      provider: record.provider,
      status: record.status,
      amountCents: record.amountCents,
      currency: record.currency,
      createdAt: record.createdAt,
      completedAt: record.status === "completed" ? record.createdAt : null,
    })),
  ].sort(
    (left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime() ||
      right.type.localeCompare(left.type) ||
      right.id.localeCompare(left.id),
  );
  const page = history.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(({ id: _id, ...item }) => item),
    nextCursor:
      history.length > limit && last
        ? { createdAt: last.createdAt, type: last.type, id: last.id }
        : null,
  };
}

export const commonPaymentsRouter = {
  listPlans: billingProcedure
    .output(z.array(planSchema))
    .handler(({ context }) => requirePaymentService(context).listPlans()),

  getBillingStatus: protectedBillingProcedure.output(billingStatusSchema).handler(({ context }) => {
    const user = resolveBillingUser(context);
    return requirePaymentService(context).getBillingStatus(user);
  }),

  // Compatibility surface for existing clients. It is now bounded; new clients use the page API.
  listPurchaseHistory: protectedBillingProcedure
    .output(z.array(purchaseHistorySchema.shape.items.element))
    .handler(async ({ context }) => (await listPurchaseHistoryPage(context, { limit: 100 })).items),

  listPurchaseHistoryPage: protectedBillingProcedure
    .input(purchaseHistoryInputSchema)
    .output(purchaseHistorySchema)
    .handler(async ({ context, input }) => {
      return listPurchaseHistoryPage(context, input);
    }),
};
