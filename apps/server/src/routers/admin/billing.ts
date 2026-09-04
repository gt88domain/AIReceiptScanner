import { controlBillingOverviewSchema } from "@repo/shared/control-read";
import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { billingEvent, paymentOperation } from "@/db/schema/payments";
import { adminProcedure } from "@/lib/orpc";
import { getAdminBillingOverviewReadModel } from "@/modules/control-read";
import { recordAdminAuditLog } from "@/modules/audit";
import { replayBillingOutboxJob } from "@/payments/application/billing-outbox";
import {
  acknowledgeWebhookEvent,
  replayWebhookEvent,
} from "@/payments/application/webhook-observability";
import {
  resolvePaymentOperationManualReview,
  retryPaymentOperation,
} from "@/payments/application/payment-operation";

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
  resolvePaymentOperationManualReview: adminProcedure
    .input(
      z.object({
        operationId: z.string().uuid(),
        resolution: z.enum(["requeue", "mark_failed"]),
      }),
    )
    .output(
      z.object({
        resolved: z.boolean(),
        reason: z
          .enum([
            "NOT_IN_MANUAL_REVIEW",
            "UNSAFE_NON_IDEMPOTENT_RETRY",
            "IDEMPOTENCY_WINDOW_EXPIRED",
            "ACTIVE_SCOPE_CONFLICT",
            "STATUS_CHANGED",
          ])
          .nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const result = await resolvePaymentOperationManualReview(
        context.db,
        input.operationId,
        input.resolution,
      );
      if (result.resolved) {
        await recordAdminAuditLog(context.db, {
          actor: context.session!.user,
          action: "billing.payment-operation.manual-review-resolved",
          entity: { type: "payment_operation", id: input.operationId },
          before: "previous" in result ? result.previous : undefined,
          after: { resolution: input.resolution },
        });
      }
      return { resolved: result.resolved, reason: result.reason };
    }),
  listDeadLetterWebhooks: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          cursor: z.object({ deadLetteredAt: z.date(), id: z.string().uuid() }).optional(),
        })
        .optional(),
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            provider: z.string(),
            eventType: z.string(),
            attemptCount: z.number().int(),
            lastError: z.string().nullable(),
            firstReceivedAt: z.date().nullable(),
            lastAttemptAt: z.date().nullable(),
            deadLetteredAt: z.date(),
          }),
        ),
        nextCursor: z.object({ deadLetteredAt: z.date(), id: z.string().uuid() }).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const rows = await context.db
        .select({
          id: billingEvent.id,
          provider: billingEvent.provider,
          eventType: billingEvent.eventType,
          attemptCount: billingEvent.attemptCount,
          lastError: billingEvent.lastError,
          firstReceivedAt: billingEvent.firstReceivedAt,
          lastAttemptAt: billingEvent.lastAttemptAt,
          deadLetteredAt: billingEvent.deadLetteredAt,
        })
        .from(billingEvent)
        .where(
          and(
            eq(billingEvent.processingStatus, "dead_letter"),
            cursor
              ? or(
                  lt(billingEvent.deadLetteredAt, cursor.deadLetteredAt),
                  and(
                    eq(billingEvent.deadLetteredAt, cursor.deadLetteredAt),
                    lt(billingEvent.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(billingEvent.deadLetteredAt), desc(billingEvent.id))
        .limit(limit + 1);
      const page = rows
        .slice(0, limit)
        .filter((row): row is typeof row & { deadLetteredAt: Date } => row.deadLetteredAt !== null);
      const last = page.at(-1);
      return {
        items: page,
        nextCursor:
          rows.length > limit && last ? { deadLetteredAt: last.deadLetteredAt, id: last.id } : null,
      };
    }),
  acknowledgeDeadLetterWebhook: adminProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .output(z.object({ acknowledged: z.boolean() }))
    .handler(async ({ context, input }) => {
      const previous = await acknowledgeWebhookEvent(context.db, input.eventId);
      if (previous) {
        await recordAdminAuditLog(context.db, {
          actor: context.session!.user,
          action: "billing.webhook.dead-letter-acknowledged",
          entity: { type: "billing_event", id: input.eventId },
          before: previous,
          after: { resolution: "acknowledged_without_replay" },
        });
      }
      return { acknowledged: Boolean(previous) };
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
