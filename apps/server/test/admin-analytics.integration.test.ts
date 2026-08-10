import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { and, count, gte, isNull } from "drizzle-orm";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { creditAccount } from "@/db/schema/credits";
import { job } from "@/db/schema/jobs";
import { billingEvent, billingPurchase, billingSubscription } from "@/db/schema/payments";
import { recordAdminAuditLog } from "@/modules/audit";
import { describe, expect, it } from "vitest";

type AnalyticsWindow = "7d" | "30d" | "90d" | "all";

type AnalyticsOverview = {
  window: AnalyticsWindow;
  generatedAt: Date;
  users: { total: number; new: number };
  billing: null | { activeSubscriptions: number; successfulPurchases: number };
  credits: null | { granted: number; consumed: number; revoked: number; restored: number };
  operations: {
    jobs: null | { pending: number; failed: number };
    webhooks: null | { pending: number; deadLettered: number };
  };
  audit: { changes: number };
};

type AnalyticsAdminClient = {
  getAnalytics(input: { window: AnalyticsWindow }): Promise<AnalyticsOverview>;
};

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

function analyticsClient(client: ReturnType<typeof getSessionClient>) {
  return client.admin as unknown as AnalyticsAdminClient;
}

async function signUp(email: string) {
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Analytics Test", password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();

  const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);

  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  expect(cookie).not.toBe("");
  return getSessionClient(cookie);
}

describe("admin analytics", () => {
  it("denies a signed-in non-admin", async () => {
    const client = await signUp("analytics-ordinary@example.test");

    await expect(
      Promise.resolve().then(() => analyticsClient(client).getAnalytics({ window: "7d" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("returns one safe, feature-aware aggregate response", async () => {
    const client = await signUp("admin@example.test");
    const db = createDb(env.DB);
    const now = new Date();
    const withinWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const outsideWindow = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const visibleUserId = crypto.randomUUID();
    const deletedUserId = crypto.randomUUID();

    await db.batch([
      db.insert(user).values([
        {
          id: visibleUserId,
          name: "Recent user",
          email: "analytics-recent@example.test",
          emailVerified: true,
          phoneNumber: null,
          phoneNumberVerified: false,
          image: null,
          createdAt: withinWindow,
          updatedAt: withinWindow,
          deletedAt: null,
        },
        {
          id: deletedUserId,
          name: "Deleted user",
          email: "analytics-deleted@example.test",
          emailVerified: true,
          phoneNumber: null,
          phoneNumberVerified: false,
          image: null,
          createdAt: withinWindow,
          updatedAt: withinWindow,
          deletedAt: now,
        },
      ]),
      db.insert(billingSubscription).values([
        {
          id: crypto.randomUUID(),
          userId: visibleUserId,
          provider: "stripe",
          providerSubscriptionId: "analytics-active-subscription",
          providerCustomerId: "analytics-customer",
          planId: "pro",
          priceId: "monthly",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          startedAt: withinWindow,
          endedAt: null,
          providerEventAt: withinWindow,
          providerEventId: "analytics-active-event",
          createdAt: withinWindow,
          updatedAt: withinWindow,
        },
        {
          id: crypto.randomUUID(),
          userId: visibleUserId,
          provider: "stripe",
          providerSubscriptionId: "analytics-cancelled-subscription",
          providerCustomerId: "analytics-customer-2",
          planId: "pro",
          priceId: "monthly",
          status: "canceled",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: true,
          startedAt: outsideWindow,
          endedAt: outsideWindow,
          providerEventAt: outsideWindow,
          providerEventId: "analytics-cancelled-event",
          createdAt: outsideWindow,
          updatedAt: outsideWindow,
        },
      ]),
      db.insert(billingPurchase).values([
        {
          id: crypto.randomUUID(),
          userId: visibleUserId,
          provider: "stripe",
          providerPaymentIntentId: "analytics-succeeded-recent",
          planId: "lifetime",
          priceId: "lifetime-price",
          status: "succeeded",
          paidAt: withinWindow,
          providerEventAt: withinWindow,
          providerEventId: "analytics-purchase-recent-event",
          createdAt: withinWindow,
          updatedAt: withinWindow,
        },
        {
          id: crypto.randomUUID(),
          userId: visibleUserId,
          provider: "stripe",
          providerPaymentIntentId: "analytics-succeeded-old",
          planId: "lifetime",
          priceId: "lifetime-price",
          status: "succeeded",
          paidAt: outsideWindow,
          providerEventAt: outsideWindow,
          providerEventId: "analytics-purchase-old-event",
          createdAt: outsideWindow,
          updatedAt: outsideWindow,
        },
        {
          id: crypto.randomUUID(),
          userId: visibleUserId,
          provider: "stripe",
          providerPaymentIntentId: "analytics-refunded",
          planId: "lifetime",
          priceId: "lifetime-price",
          status: "refunded",
          paidAt: withinWindow,
          providerEventAt: withinWindow,
          providerEventId: "analytics-purchase-refunded-event",
          createdAt: withinWindow,
          updatedAt: withinWindow,
        },
      ]),
      db.insert(creditAccount).values({
        userId: visibleUserId,
        balance: 25,
        totalGranted: 100,
        totalConsumed: 50,
        totalExpired: 5,
        totalRevoked: 15,
        totalRestored: 10,
        billingHold: false,
        createdAt: withinWindow,
        updatedAt: withinWindow,
      }),
      db.insert(job).values([
        {
          id: crypto.randomUUID(),
          idempotencyKey: "analytics-pending-job",
          type: "analytics.test",
          ownerId: null,
          status: "pending",
          payload: {},
          payloadHash: "analytics-pending",
          result: null,
          error: null,
          attemptCount: 0,
          maxAttempts: 3,
          runAfter: now,
          lockedAt: null,
          leaseToken: null,
          leaseUntil: null,
          startedAt: null,
          completedAt: null,
          createdAt: withinWindow,
          updatedAt: withinWindow,
        },
        {
          id: crypto.randomUUID(),
          idempotencyKey: "analytics-failed-job",
          type: "analytics.test",
          ownerId: null,
          status: "failed",
          payload: {},
          payloadHash: "analytics-failed",
          result: null,
          error: "test failure",
          attemptCount: 3,
          maxAttempts: 3,
          runAfter: now,
          lockedAt: null,
          leaseToken: null,
          leaseUntil: null,
          startedAt: withinWindow,
          completedAt: withinWindow,
          createdAt: withinWindow,
          updatedAt: withinWindow,
        },
      ]),
      db.insert(billingEvent).values([
        {
          id: crypto.randomUUID(),
          provider: "stripe",
          providerEventId: "analytics-pending-webhook",
          eventType: "invoice.paid",
          processedAt: withinWindow,
          payloadJson: '{"secret":"do-not-return"}',
          processingStatus: "pending",
          handlerVersion: 1,
          firstReceivedAt: withinWindow,
          lastAttemptAt: null,
          attemptCount: 0,
          lastError: null,
          leaseUntil: null,
          leaseToken: null,
          nextRetryAt: null,
          alertedAt: null,
          alertLeaseToken: null,
          alertLeaseUntil: null,
          deadLetteredAt: null,
        },
        {
          id: crypto.randomUUID(),
          provider: "stripe",
          providerEventId: "analytics-dead-letter-webhook",
          eventType: "invoice.paid",
          processedAt: withinWindow,
          payloadJson: '{"token":"do-not-return"}',
          processingStatus: "dead_letter",
          handlerVersion: 1,
          firstReceivedAt: withinWindow,
          lastAttemptAt: withinWindow,
          attemptCount: 3,
          lastError: "test failure",
          leaseUntil: null,
          leaseToken: null,
          nextRetryAt: null,
          alertedAt: null,
          alertLeaseToken: null,
          alertLeaseUntil: null,
          deadLetteredAt: withinWindow,
        },
      ]),
    ]);
    const actor = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind("admin@example.test")
      .first<{ id: string }>();
    await recordAdminAuditLog(db, {
      actor: { id: actor!.id, email: "admin@example.test" },
      action: "analytics.test.updated",
      entity: { type: "analytics_test", id: visibleUserId },
      after: { status: "complete" },
    });

    const analytics = await analyticsClient(client).getAnalytics({ window: "7d" });
    const windowStart = new Date(analytics.generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [expectedTotal] = await db
      .select({ count: count() })
      .from(user)
      .where(isNull(user.deletedAt));
    const [expectedNew] = await db
      .select({ count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), gte(user.createdAt, windowStart)));

    expect(analytics.users).toEqual({
      total: expectedTotal?.count ?? 0,
      new: expectedNew?.count ?? 0,
    });
    expect(analytics.billing).toEqual({ activeSubscriptions: 1, successfulPurchases: 1 });
    expect(analytics.credits).toEqual({ granted: 100, consumed: 50, revoked: 15, restored: 10 });
    expect(analytics.operations.jobs).toEqual({ pending: 1, failed: 1 });
    expect(analytics.operations.webhooks).toEqual({ pending: 1, deadLettered: 1 });
    expect(analytics.audit.changes).toBe(1);
    expect(JSON.stringify(analytics)).not.toContain("do-not-return");
    expect(JSON.stringify(analytics)).not.toContain("analytics-recent@example.test");
  });

  it("keeps analytics in Admin Core for the directory-lite profile", async () => {
    const { buildRuntimeAppRouter } = await import("@/routers/runtime-router");
    const { createPlatformComposition, productProfiles } = await import("@repo/app-config");
    const composition = createPlatformComposition({
      features: productProfiles["directory-lite"].features,
      featureCapabilities: {},
    });
    const router = buildRuntimeAppRouter(composition);
    const admin = Object.getOwnPropertyDescriptor(router, "admin")?.value as Record<
      string,
      unknown
    >;

    expect(admin.getAnalytics).toBeTypeOf("object");
    expect(admin.listFailedJobs).toBeUndefined();
    expect(admin.getPaymentProviderHealth).toBeUndefined();
  });
});
