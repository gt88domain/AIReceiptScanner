import { resolveCommonConfig, resolveWebCommonConfig } from "@repo/app-config";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@repo/app-config/payments/web";
import {
  controlReadV1SchemaVersion,
  type ControlAnalyticsInputV1,
  type ControlAuditInputV1,
  type ControlIntegrationsV1,
  type ControlSystemV1,
  type ControlUsersInputV1,
} from "@repo/shared/control-read";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import templateVersion from "../../../../../template-version.json";
import { normalizeAvatarForOutput } from "@/auth/avatar-policy";
import type { Database } from "@/db";
import { user } from "@/db/schema/auth";
import { creditAccount } from "@/db/schema/credits";
import { job } from "@/db/schema/jobs";
import { billingEvent, billingPurchase, billingSubscription } from "@/db/schema/payments";
import type { Context } from "@/lib/context";
import { countAdminAuditLogs, listAdminAuditLogs } from "@/modules/audit/audit.repository";
import { countFailedJobEvents } from "@/modules/jobs/job.dead-letter";

export type ControlReadDependencies = Pick<Context, "db" | "env" | "runtimeConfig"> & {
  jobs?: unknown;
  storage?: unknown;
};

type AnalyticsWindow = ControlAnalyticsInputV1["window"];

function resolveWindowStart(window: AnalyticsWindow, now: Date) {
  const days = window === "all" ? null : Number.parseInt(window, 10);
  return days === null ? null : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function countRows(
  db: Database,
  where: ReturnType<typeof and> | undefined,
  table: typeof billingPurchase | typeof billingSubscription | typeof billingEvent | typeof job,
) {
  const [row] = await db.select({ count: count() }).from(table).where(where);
  return row?.count ?? 0;
}

export async function getAdminUserSummaryReadModel(db: Database) {
  const [result] = await db.select({ count: count() }).from(user).where(isNull(user.deletedAt));
  return { users: result?.count ?? 0 };
}

export async function listAdminUsersReadModel(
  { db, env }: Pick<ControlReadDependencies, "db" | "env">,
  input: ControlUsersInputV1,
) {
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
    db
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
    db.select({ count: count() }).from(user).where(whereClause),
  ]);
  const total = countResult.at(0)?.count ?? 0;
  return {
    data: users.map((userItem) => normalizeAvatarForOutput(userItem, env.SERVER_URL)),
    pageCount: Math.ceil(total / input.perPage),
    total,
  };
}

export async function getAdminAnalyticsReadModel(
  { db, runtimeConfig }: Pick<ControlReadDependencies, "db" | "runtimeConfig">,
  input: ControlAnalyticsInputV1,
) {
  const generatedAt = new Date();
  const windowStart = resolveWindowStart(input.window, generatedAt);
  const purchaseWindow = windowStart ? gte(billingPurchase.paidAt, windowStart) : undefined;
  const newUserWindow = windowStart ? gte(user.createdAt, windowStart) : undefined;
  const modules = runtimeConfig.composition.modules;
  const [totalUsers, newUsers, auditChanges, billing, credits, jobs, webhooks] = await Promise.all([
    getAdminUserSummaryReadModel(db).then((summary) => summary.users),
    db
      .select({ count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), newUserWindow))
      .then((rows) => rows.at(0)?.count ?? 0),
    countAdminAuditLogs(db),
    modules.billing
      ? Promise.all([
          countRows(
            db,
            inArray(billingSubscription.status, [...ACTIVE_SUBSCRIPTION_STATUSES]),
            billingSubscription,
          ),
          countRows(
            db,
            and(eq(billingPurchase.status, "succeeded"), purchaseWindow),
            billingPurchase,
          ),
        ]).then(([activeSubscriptions, successfulPurchases]) => ({
          activeSubscriptions,
          successfulPurchases,
        }))
      : Promise.resolve(null),
    modules.credits
      ? db
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
          countRows(db, eq(job.status, "pending"), job),
          countRows(db, eq(job.status, "failed"), job),
        ]).then(([pending, failed]) => ({ pending, failed }))
      : Promise.resolve(null),
    modules.billing
      ? Promise.all([
          countRows(db, eq(billingEvent.processingStatus, "pending"), billingEvent),
          countRows(db, eq(billingEvent.processingStatus, "dead_letter"), billingEvent),
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
}

type IntegrationStatus = ControlIntegrationsV1[number]["status"];

function configurationStatus(enabled: boolean, configured: boolean): IntegrationStatus {
  if (!enabled) return "disabled";
  return configured ? "configured" : "missing";
}

export function getAdminIntegrationsReadModel({
  env,
  jobs,
  runtimeConfig,
  storage,
}: ControlReadDependencies) {
  const features = runtimeConfig.features;
  const paymentProvider = resolveWebCommonConfig().payments?.provider;
  const authMethods = resolveCommonConfig().auth.methods;
  return [
    { id: "d1", category: "infrastructure" as const, status: "configured" as const },
    {
      id: "r2",
      category: "infrastructure" as const,
      status: configurationStatus(features.storage, Boolean(storage)),
    },
    {
      id: "queue",
      category: "infrastructure" as const,
      status: configurationStatus(features.jobs, Boolean(jobs)),
    },
    {
      id: "github",
      category: "authentication" as const,
      status: configurationStatus(
        authMethods.githubEnabled === true,
        Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      ),
    },
    {
      id: "google",
      category: "authentication" as const,
      status: configurationStatus(
        authMethods.googleEnabled === true,
        Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      ),
    },
    {
      id: "apple",
      category: "authentication" as const,
      status: configurationStatus(
        authMethods.appleEnabled === true,
        Boolean(env.APPLE_APP_BUNDLE_IDENTIFIER),
      ),
    },
    {
      id: "stripe",
      category: "payments" as const,
      status: configurationStatus(
        features.web.billing && paymentProvider === "stripe",
        Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
      ),
    },
    {
      id: "revenuecat",
      category: "payments" as const,
      status: configurationStatus(features.native.billing, Boolean(env.REVENUECAT_WEBHOOK_SECRET)),
    },
    {
      id: "resend",
      category: "email" as const,
      status: configurationStatus(
        runtimeConfig.email.enabled,
        runtimeConfig.email.enabled && Boolean(env.RESEND_API_KEY),
      ),
    },
  ];
}

async function getAdminOperationalReadModel({ db, runtimeConfig }: ControlReadDependencies) {
  const { features } = runtimeConfig;
  const [failedJobs, pendingWebhooks] = await Promise.all([
    features.jobs ? countFailedJobEvents(db) : Promise.resolve(null),
    features.billing
      ? db
          .select({ count: count() })
          .from(billingEvent)
          .where(
            and(eq(billingEvent.processingStatus, "pending"), isNull(billingEvent.deadLetteredAt)),
          )
          .then((rows) => rows.at(0)?.count ?? 0)
      : Promise.resolve(null),
  ]);
  return { failedJobs, pendingWebhooks };
}

export async function getAdminSystemReadModel(
  dependencies: ControlReadDependencies,
): Promise<ControlSystemV1> {
  const { runtimeConfig, storage, jobs } = dependencies;
  const { features } = runtimeConfig;
  const operational = await getAdminOperationalReadModel(dependencies);
  return {
    application: {
      templateVersion: templateVersion.version,
      environment: dependencies.env.NODE_ENV,
    },
    modules: [
      { id: "auth", enabled: true },
      { id: "admin", enabled: features.admin },
      { id: "billing", enabled: features.billing },
      { id: "credits", enabled: features.credits },
      { id: "storage", enabled: features.storage },
      { id: "jobs", enabled: features.jobs },
    ],
    resources: [
      { id: "d1", status: "configured" },
      { id: "r2", status: configurationStatus(features.storage, Boolean(storage)) },
      { id: "queue", status: configurationStatus(features.jobs, Boolean(jobs)) },
    ],
    operational,
  };
}

export async function getAdminBillingOverviewReadModel({
  db,
}: Pick<ControlReadDependencies, "db">) {
  const [
    userCount,
    activeSubscriptionCount,
    successfulPurchaseCount,
    pendingWebhookCount,
    failedWebhookCount,
    subscriptions,
    purchases,
    webhooks,
  ] = await Promise.all([
    db.select({ count: count() }).from(user).where(isNull(user.deletedAt)),
    db
      .select({ count: count() })
      .from(billingSubscription)
      .where(inArray(billingSubscription.status, [...ACTIVE_SUBSCRIPTION_STATUSES])),
    db
      .select({ count: count() })
      .from(billingPurchase)
      .where(eq(billingPurchase.status, "succeeded")),
    db
      .select({ count: count() })
      .from(billingEvent)
      .where(eq(billingEvent.processingStatus, "pending")),
    db
      .select({ count: count() })
      .from(billingEvent)
      .where(
        or(eq(billingEvent.processingStatus, "dead_letter"), isNotNull(billingEvent.lastError)),
      ),
    db
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
    db
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
    db
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
      failedWebhooks: failedWebhookCount.at(0)?.count ?? 0,
    },
    subscriptions,
    purchases,
    webhooks,
  };
}

export async function listAdminAuditReadModel(db: Database, input: ControlAuditInputV1) {
  const [data, total] = await Promise.all([
    listAdminAuditLogs(db, { limit: input.perPage, offset: (input.page - 1) * input.perPage }),
    countAdminAuditLogs(db),
  ]);
  return { data, pageCount: Math.ceil(total / input.perPage), total };
}

export async function getControlSnapshotReadModel(dependencies: ControlReadDependencies) {
  const [{ users }, operational] = await Promise.all([
    getAdminUserSummaryReadModel(dependencies.db),
    getAdminOperationalReadModel(dependencies),
  ]);
  const modules = dependencies.runtimeConfig.composition.modules;
  const warning = (operational.failedJobs ?? 0) > 0 || (operational.pendingWebhooks ?? 0) > 0;
  return {
    schemaVersion: controlReadV1SchemaVersion,
    project: { id: templateVersion.template, name: resolveCommonConfig().app.name },
    build: {
      appVersion: null,
      templateVersion: templateVersion.version,
      commit: null,
      profile: null,
    },
    status: warning ? ("warning" as const) : ("ok" as const),
    modules: {
      auth: true,
      admin: modules.admin.core,
      billing: modules.billing,
      credits: modules.credits,
      storage: modules.storage,
      jobs: modules.jobs,
    },
    counts: { users, ...operational },
    generatedAt: new Date().toISOString(),
  };
}
