import { ACTIVE_SUBSCRIPTION_STATUSES } from "@repo/app-config/payments/web";
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema/auth";
import { billingEvent, billingPurchase, billingSubscription } from "@/db/schema/payments";
import { isAdminEmail } from "@/lib/admin";
import { isServerFeatureEnabled } from "@/lib/module-config";
import { adminProcedure, protectedProcedure } from "@/lib/orpc";
import { replayBillingOutboxJob } from "@/payments/application/billing-outbox";
import { replayWebhookEvent } from "@/payments/application/webhook-observability";
import { countAdminAuditLogs, listAdminAuditLogs } from "@/modules/audit/audit.repository";
import { recordAdminAuditLog } from "@/modules/audit";
import {
  countFailedJobEvents,
  listFailedJobEvents,
  resolveFailedJobEvent,
} from "@/modules/jobs/job.dead-letter";

const listUsersInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  name: z.string().max(255).optional(),
  sort: z
    .array(z.object({ id: z.enum(["name", "email", "createdAt"]), desc: z.boolean() }))
    .optional()
    .default([{ id: "createdAt", desc: true }]),
});

const adminUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  phoneNumber: z.string().nullable(),
  phoneNumberVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const listAuditLogInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});

const auditSnapshotSchema = z.record(z.string(), z.unknown()).nullable();
const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: auditSnapshotSchema,
  after: auditSnapshotSchema,
  createdAt: z.date(),
});

const failedJobEventSchema = z.object({
  id: z.string(),
  queueMessageId: z.string(),
  jobId: z.string(),
  jobType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  error: z.string(),
  attempts: z.number(),
  failedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().nullable(),
  resolution: z.enum(["retried", "ignored", "refunded"]).nullable(),
});

const failedJobEventActionSchema = z.object({ id: z.string().min(1) });

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

/** Read-only operational data. Payment entitlements remain webhook-owned. */
export const adminRouter = {
  getAccess: protectedProcedure.handler(({ context }) => ({
    isAdmin:
      isServerFeatureEnabled("admin") &&
      isAdminEmail(context.session?.user.email, context.env.ADMIN_EMAILS),
  })),

  listUsers: adminProcedure
    .input(listUsersInputSchema)
    .output(z.object({ data: z.array(adminUserSchema), pageCount: z.number(), total: z.number() }))
    .handler(async ({ context, input }) => {
      const whereClause = and(
        isNull(user.deletedAt),
        input.name
          ? or(
              sql`instr(lower(${user.name}), lower(${input.name})) > 0`,
              sql`instr(lower(${user.email}), lower(${input.name})) > 0`,
              sql`instr(lower(${user.phoneNumber}), lower(${input.name})) > 0`,
            )
          : undefined,
      );
      const columnMap = { name: user.name, email: user.email, createdAt: user.createdAt } as const;
      const orderBy = input.sort.map((sort) =>
        sort.desc ? desc(columnMap[sort.id]) : asc(columnMap[sort.id]),
      );
      const [users, countResult] = await Promise.all([
        context.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            phoneNumberVerified: user.phoneNumberVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .where(whereClause)
          .orderBy(...orderBy)
          .limit(input.perPage)
          .offset((input.page - 1) * input.perPage),
        context.db.select({ count: count() }).from(user).where(whereClause),
      ]);
      const total = countResult.at(0)?.count ?? 0;
      return { data: users, pageCount: Math.ceil(total / input.perPage), total };
    }),

  replayWebhook: adminProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .output(z.object({ queued: z.boolean() }))
    .handler(async ({ context, input }) => ({
      queued: await replayWebhookEvent(context.db, input.eventId),
    })),

  replayBillingOutboxJob: adminProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .output(z.object({ queued: z.boolean() }))
    .handler(async ({ context, input }) => ({
      queued: await replayBillingOutboxJob(context.db, input.jobId),
    })),
  listAuditLog: adminProcedure
    .input(listAuditLogInputSchema)
    .output(z.object({ data: z.array(auditLogSchema), pageCount: z.number(), total: z.number() }))
    .handler(async ({ context, input }) => {
      const [data, total] = await Promise.all([
        listAdminAuditLogs(context.db, {
          limit: input.perPage,
          offset: (input.page - 1) * input.perPage,
        }),
        countAdminAuditLogs(context.db),
      ]);
      return { data, pageCount: Math.ceil(total / input.perPage), total };
    }),

  listFailedJobs: adminProcedure
    .input(listAuditLogInputSchema)
    .output(
      z.object({ data: z.array(failedJobEventSchema), pageCount: z.number(), total: z.number() }),
    )
    .handler(async ({ context, input }) => {
      const [data, total] = await Promise.all([
        listFailedJobEvents(context.db, {
          limit: input.perPage,
          offset: (input.page - 1) * input.perPage,
        }),
        countFailedJobEvents(context.db),
      ]);
      return { data, pageCount: Math.ceil(total / input.perPage), total };
    }),

  retryFailedJob: adminProcedure
    .input(failedJobEventActionSchema)
    .output(z.object({ retried: z.boolean() }))
    .handler(async ({ context, input }) => {
      const actor = context.session!.user;
      const retried = await context.jobs.retryFailed({
        failedJobEventId: input.id,
        resolvedBy: actor.id,
      });
      if (retried) {
        await recordAdminAuditLog(context.db, {
          actor,
          action: "jobs.failed.retried",
          entity: { type: "failed_job_event", id: input.id },
          after: { resolution: "retried" },
        });
      }
      return { retried };
    }),

  ignoreFailedJob: adminProcedure
    .input(failedJobEventActionSchema)
    .output(z.object({ ignored: z.boolean() }))
    .handler(async ({ context, input }) => {
      const actor = context.session!.user;
      const ignored = await resolveFailedJobEvent(context.db, {
        id: input.id,
        resolvedBy: actor.id,
        resolution: "ignored",
      });
      if (ignored) {
        await recordAdminAuditLog(context.db, {
          actor,
          action: "jobs.failed.ignored",
          entity: { type: "failed_job_event", id: input.id },
          after: { resolution: "ignored" },
        });
      }
      return { ignored: Boolean(ignored) };
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
