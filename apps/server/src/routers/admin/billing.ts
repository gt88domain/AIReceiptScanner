import { controlBillingOverviewSchema } from "@repo/shared/control-read";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { paymentOperation } from "@/db/schema/payments";
import { adminProcedure } from "@/lib/orpc";
import { getAdminBillingOverviewReadModel } from "@/modules/control-read";
import { recordAdminAuditLog } from "@/modules/audit";
import { replayBillingOutboxJob } from "@/payments/application/billing-outbox";
import { replayWebhookEvent } from "@/payments/application/webhook-observability";
import { retryPaymentOperation } from "@/payments/application/payment-operation";

const paymentOperationSchema = z.object({
  id: z.string(),
  operationType: z.enum(["checkout", "credit_checkout", "subscription_upgrade"]),
  provider: z.string(),
  status: z.enum([
    "pending",
    "processing",
    "provider_succeeded",
    "completed",
    "failed",
    "manual_review",
  ]),
  attemptCount: z.number(),
  manualReviewCode: z.string().nullable(),
  relatedResourceType: z.enum(["checkout_session", "credit_order", "subscription"]).nullable(),
  relatedResourceId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Static billing administration boundary; runtime composition omits it when Billing is disabled. */
export const adminBillingRouter = {
  listPaymentOperations: adminProcedure
    .input(
      z.object({
        status: paymentOperationSchema.shape.status.optional(),
        provider: z.string().optional(),
        operationType: paymentOperationSchema.shape.operationType.optional(),
        userId: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .output(z.array(paymentOperationSchema))
    .handler(async ({ context, input }) =>
      context.db
        .select({
          id: paymentOperation.id,
          operationType: paymentOperation.operationType,
          provider: paymentOperation.provider,
          status: paymentOperation.status,
          attemptCount: paymentOperation.attemptCount,
          manualReviewCode: paymentOperation.manualReviewCode,
          relatedResourceType: paymentOperation.relatedResourceType,
          relatedResourceId: paymentOperation.relatedResourceId,
          createdAt: paymentOperation.createdAt,
          updatedAt: paymentOperation.updatedAt,
        })
        .from(paymentOperation)
        .where(
          and(
            ...([
              input.status ? eq(paymentOperation.status, input.status) : undefined,
              input.provider
                ? eq(
                    paymentOperation.provider,
                    input.provider as typeof paymentOperation.$inferSelect.provider,
                  )
                : undefined,
              input.operationType
                ? eq(paymentOperation.operationType, input.operationType)
                : undefined,
              input.userId ? eq(paymentOperation.userId, input.userId) : undefined,
              input.from ? gte(paymentOperation.createdAt, input.from) : undefined,
              input.to ? lte(paymentOperation.createdAt, input.to) : undefined,
            ].filter(Boolean) as ReturnType<typeof eq>[]),
          ),
        )
        .orderBy(desc(paymentOperation.createdAt))
        .limit(100),
    ),
  retryPaymentOperation: adminProcedure
    .input(z.object({ operationId: z.string().uuid() }))
    .output(z.object({ queued: z.boolean() }))
    .handler(async ({ context, input }) => {
      const queued = await retryPaymentOperation(context.db, input.operationId);
      if (queued)
        await recordAdminAuditLog(context.db, {
          actor: context.session!.user,
          action: "billing.payment-operation.retried",
          entity: { type: "payment_operation", id: input.operationId },
          after: { resolution: "requeued" },
        });
      return { queued };
    }),
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
  overview: adminProcedure
    .output(controlBillingOverviewSchema)
    .handler(({ context }) => getAdminBillingOverviewReadModel(context)),
};
