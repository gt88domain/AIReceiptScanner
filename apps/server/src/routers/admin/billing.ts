import { ACTIVE_SUBSCRIPTION_STATUSES } from "@repo/app-config/payments/web";
import { count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema/auth";
import { billingEvent, billingPurchase, billingSubscription } from "@/db/schema/payments";
import { adminProcedure } from "@/lib/orpc";
import { recordAdminAuditLog } from "@/modules/audit";
import { replayBillingOutboxJob } from "@/payments/application/billing-outbox";
import { replayWebhookEvent } from "@/payments/application/webhook-observability";

const overviewSchema = z.object({
  stats: z.object({
    users: z.number(),
    activeSubscriptions: z.number(),
    successfulPurchases: z.number(),
    pendingWebhooks: z.number(),
  }),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      email: z.string().nullable(),
      provider: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: z.string(),
      currentPeriodEnd: z.date().nullable(),
      updatedAt: z.date(),
    }),
  ),
  purchases: z.array(
    z.object({
      id: z.string(),
      email: z.string().nullable(),
      provider: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: z.string(),
      paidAt: z.date().nullable(),
      updatedAt: z.date(),
    }),
  ),
  webhooks: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      eventType: z.string(),
      processingStatus: z.enum(["pending", "processing", "processed", "dead_letter"]),
      processedAt: z.date(),
      firstReceivedAt: z.date().nullable(),
      lastAttemptAt: z.date().nullable(),
      attemptCount: z.number(),
      lastError: z.string().nullable(),
    }),
  ),
});

/** Static billing administration boundary; its physical omission is a v0.4.5 concern. */
export const adminBillingRouter = {
  replayWebhook: adminProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .output(z.object({ queued: z.boolean() }))
    .handler(async ({ context, input }) => {
      const queued = await replayWebhookEvent(context.db, input.eventId);
      if (queued) {
        await recordAdminAuditLog(context.db, {
          actor: context.session!.user,
          action: "billing.webhook.replayed",
          entity: { type: "billing_event", id: input.eventId },
          after: { resolution: "replayed" },
        });
      }
      return { queued };
    }),
  replayBillingOutboxJob: adminProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .output(z.object({ queued: z.boolean() }))
    .handler(async ({ context, input }) => {
      const queued = await replayBillingOutboxJob(context.db, input.jobId);
      if (queued) {
        await recordAdminAuditLog(context.db, {
          actor: context.session!.user,
          action: "billing.outbox.replayed",
          entity: { type: "billing_outbox", id: input.jobId },
          after: { resolution: "replayed" },
        });
      }
      return { queued };
    }),
  overview: adminProcedure.output(overviewSchema).handler(async ({ context }) => {
    const activeStatuses = [...ACTIVE_SUBSCRIPTION_STATUSES];
    const [
      userCount,
      activeSubscriptionCount,
      successfulPurchaseCount,
      pendingWebhookCount,
      subscriptions,
      purchases,
      webhooks,
    ] = await Promise.all([
      context.db.select({ count: count() }).from(user),
      context.db
        .select({ count: count() })
        .from(billingSubscription)
        .where(inArray(billingSubscription.status, activeStatuses)),
      context.db
        .select({ count: count() })
        .from(billingPurchase)
        .where(eq(billingPurchase.status, "succeeded")),
      context.db
        .select({ count: count() })
        .from(billingEvent)
        .where(eq(billingEvent.processingStatus, "pending")),
      context.db
        .select({
          id: billingSubscription.id,
          email: user.email,
          provider: billingSubscription.provider,
          planId: billingSubscription.planId,
          priceId: billingSubscription.priceId,
          status: billingSubscription.status,
          currentPeriodEnd: billingSubscription.currentPeriodEnd,
          updatedAt: billingSubscription.updatedAt,
        })
        .from(billingSubscription)
        .leftJoin(user, eq(billingSubscription.userId, user.id))
        .orderBy(desc(billingSubscription.updatedAt))
        .limit(10),
      context.db
        .select({
          id: billingPurchase.id,
          email: user.email,
          provider: billingPurchase.provider,
          planId: billingPurchase.planId,
          priceId: billingPurchase.priceId,
          status: billingPurchase.status,
          paidAt: billingPurchase.paidAt,
          updatedAt: billingPurchase.updatedAt,
        })
        .from(billingPurchase)
        .leftJoin(user, eq(billingPurchase.userId, user.id))
        .orderBy(desc(billingPurchase.updatedAt))
        .limit(10),
      context.db
        .select({
          id: billingEvent.id,
          provider: billingEvent.provider,
          eventType: billingEvent.eventType,
          processingStatus: billingEvent.processingStatus,
          processedAt: billingEvent.processedAt,
          firstReceivedAt: billingEvent.firstReceivedAt,
          lastAttemptAt: billingEvent.lastAttemptAt,
          attemptCount: billingEvent.attemptCount,
          lastError: billingEvent.lastError,
        })
        .from(billingEvent)
        .orderBy(desc(billingEvent.processedAt))
        .limit(10),
    ]);
    return {
      stats: {
        users: userCount.at(0)?.count ?? 0,
        activeSubscriptions: activeSubscriptionCount.at(0)?.count ?? 0,
        successfulPurchases: successfulPurchaseCount.at(0)?.count ?? 0,
        pendingWebhooks: pendingWebhookCount.at(0)?.count ?? 0,
      },
      subscriptions,
      purchases,
      webhooks,
    };
  }),
};
