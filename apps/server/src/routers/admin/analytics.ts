import { ACTIVE_SUBSCRIPTION_STATUSES } from "@repo/app-config/payments/web";
import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema/auth";
import { creditAccount } from "@/db/schema/credits";
import { job } from "@/db/schema/jobs";
import { billingEvent, billingPurchase, billingSubscription } from "@/db/schema/payments";
import { adminProcedure } from "@/lib/orpc";
import { countAdminAuditLogs } from "@/modules/audit/audit.repository";

const analyticsWindowSchema = z.enum(["7d", "30d", "90d", "all"]);
const analyticsInputSchema = z.object({ window: analyticsWindowSchema });
const analyticsOverviewSchema = z.object({
  window: analyticsWindowSchema,
  generatedAt: z.date(),
  users: z.object({ total: z.number(), new: z.number() }),
  billing: z
    .object({ activeSubscriptions: z.number(), successfulPurchases: z.number() })
    .nullable(),
  credits: z
    .object({
      granted: z.number(),
      consumed: z.number(),
      revoked: z.number(),
      restored: z.number(),
    })
    .nullable(),
  operations: z.object({
    jobs: z.object({ pending: z.number(), failed: z.number() }).nullable(),
    webhooks: z.object({ pending: z.number(), deadLettered: z.number() }).nullable(),
  }),
  audit: z.object({ changes: z.number() }),
});

type AnalyticsWindow = z.infer<typeof analyticsWindowSchema>;

function resolveWindowStart(window: AnalyticsWindow, now: Date) {
  const days = window === "all" ? null : Number.parseInt(window, 10);
  return days === null ? null : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function countRows(
  db: Parameters<typeof countAdminAuditLogs>[0],
  where: ReturnType<typeof and> | undefined,
  table: typeof billingPurchase | typeof billingSubscription | typeof billingEvent | typeof job,
) {
  const [row] = await db.select({ count: count() }).from(table).where(where);
  return row?.count ?? 0;
}

/**
 * Aggregate-only Admin read model. Optional-module queries are composed only
 * when their platform module is enabled; it never initializes provider clients.
 */
export const adminAnalyticsRouter = {
  getAnalytics: adminProcedure
    .input(analyticsInputSchema)
    .output(analyticsOverviewSchema)
    .handler(async ({ context, input }) => {
      const generatedAt = new Date();
      const windowStart = resolveWindowStart(input.window, generatedAt);
      const purchaseWindow = windowStart ? gte(billingPurchase.paidAt, windowStart) : undefined;
      const newUserWindow = windowStart ? gte(user.createdAt, windowStart) : undefined;
      const modules = context.runtimeConfig.composition.modules;

      const [totalUsers, newUsers, auditChanges, billing, credits, jobs, webhooks] =
        await Promise.all([
          context.db
            .select({ count: count() })
            .from(user)
            .where(isNull(user.deletedAt))
            .then((rows) => rows.at(0)?.count ?? 0),
          context.db
            .select({ count: count() })
            .from(user)
            .where(and(isNull(user.deletedAt), newUserWindow))
            .then((rows) => rows.at(0)?.count ?? 0),
          countAdminAuditLogs(context.db),
          modules.billing
            ? Promise.all([
                countRows(
                  context.db,
                  inArray(billingSubscription.status, [...ACTIVE_SUBSCRIPTION_STATUSES]),
                  billingSubscription,
                ),
                countRows(
                  context.db,
                  and(eq(billingPurchase.status, "succeeded"), purchaseWindow),
                  billingPurchase,
                ),
              ]).then(([activeSubscriptions, successfulPurchases]) => ({
                activeSubscriptions,
                successfulPurchases,
              }))
            : Promise.resolve(null),
          modules.credits
            ? context.db
                .select({
                  granted: sql<number>`coalesce(sum(${creditAccount.totalGranted}), 0)`,
                  consumed: sql<number>`coalesce(sum(${creditAccount.totalConsumed}), 0)`,
                  revoked: sql<number>`coalesce(sum(${creditAccount.totalRevoked}), 0)`,
                  restored: sql<number>`coalesce(sum(${creditAccount.totalRestored}), 0)`,
                })
                .from(creditAccount)
                .then((rows) => rows.at(0) ?? { granted: 0, consumed: 0, revoked: 0, restored: 0 })
            : Promise.resolve(null),
          modules.jobs
            ? Promise.all([
                countRows(context.db, eq(job.status, "pending"), job),
                countRows(context.db, eq(job.status, "failed"), job),
              ]).then(([pending, failed]) => ({ pending, failed }))
            : Promise.resolve(null),
          modules.billing
            ? Promise.all([
                countRows(context.db, eq(billingEvent.processingStatus, "pending"), billingEvent),
                countRows(
                  context.db,
                  eq(billingEvent.processingStatus, "dead_letter"),
                  billingEvent,
                ),
              ]).then(([pending, deadLettered]) => ({ pending, deadLettered }))
            : Promise.resolve(null),
        ]);

      return {
        window: input.window,
        generatedAt,
        users: { total: totalUsers, new: newUsers },
        billing,
        credits,
        operations: { jobs, webhooks },
        audit: { changes: auditChanges },
      };
    }),
};
