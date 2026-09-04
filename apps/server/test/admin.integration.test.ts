import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { createDb } from "@/db";
import { creditOrder } from "@/db/schema/credits";
import { failedJobEvent, job, jobOutbox } from "@/db/schema/jobs";
import {
  billingEvent,
  billingPurchase,
  billingSubscription,
  paymentOperation,
} from "@/db/schema/payments";
import { recordAdminAuditLog } from "@/modules/audit";
import { describe, expect, it } from "vitest";

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

async function signUp(email: string) {
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Integration Test", password: "test-password-123" }),
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

  const setCookies = response.headers.getSetCookie();
  const cookie = (setCookies.length > 0 ? setCookies : [response.headers.get("set-cookie") ?? ""])
    .filter(Boolean)
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  expect(cookie).not.toBe("");
  return getSessionClient(cookie);
}

describe("administrator RPC authorization", () => {
  it("denies a signed-in non-admin before reading operational data", async () => {
    const client = await signUp("ordinary@example.test");

    await expect(client.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    await expect(client.admin.getUserSummary()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(client.admin.getIntegrations()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(client.admin.getSystem()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(client.admin.getMigrationStatus()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(client.admin.listAuditLog({ page: 1, perPage: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(client.admin.listDeadLetterWebhooks({ limit: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    await expect(
      client.admin.acknowledgeDeadLetterWebhook({ eventId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    await expect(
      client.admin.resolvePaymentOperationManualReview({
        operationId: crypto.randomUUID(),
        resolution: "mark_failed",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("permits only the Worker-secret allowlisted email", async () => {
    const client = await signUp("admin@example.test");
    const actor = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind("admin@example.test")
      .first<{ id: string }>();
    expect(actor?.id).toBeTruthy();
    await recordAdminAuditLog(createDb(env.DB), {
      actor: { id: actor!.id, email: "admin@example.test" },
      action: "catalog.domain.updated",
      entity: { type: "domain", id: "domain-123" },
      before: { status: "draft", apiToken: "do-not-store" },
      after: { status: "published" },
    });
    const db = createDb(env.DB);
    const deadLetteredAt = new Date();
    const deadLetterIds = [crypto.randomUUID(), crypto.randomUUID()];
    await db.insert(billingEvent).values(
      deadLetterIds.map((id) => ({
        id,
        provider: "stripe" as const,
        providerEventId: `provider-${id}`,
        eventType: "charge.refunded",
        processedAt: deadLetteredAt,
        payloadJson: "{}",
        processingStatus: "dead_letter" as const,
        firstReceivedAt: deadLetteredAt,
        attemptCount: 1,
        lastError: "manual review",
        deadLetteredAt,
      })),
    );
    const manualOperationId = crypto.randomUUID();
    await db.insert(paymentOperation).values({
      id: manualOperationId,
      operationKey: `${actor!.id}:checkout:${manualOperationId}`,
      scopeKey: null,
      userId: actor!.id,
      provider: "stripe",
      operationType: "checkout",
      requestVersion: 1,
      requestHash: "admin-manual-review",
      requestJson: '{"version":1,"payload":{}}',
      status: "manual_review",
      idempotencyMode: "local_only",
      attemptCount: 1,
      retryable: false,
      lastError: "provider result ambiguous",
      manualReviewCode: "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
      createdAt: deadLetteredAt,
      updatedAt: deadLetteredAt,
    });
    const concurrentManualOperationId = crypto.randomUUID();
    await db.insert(paymentOperation).values({
      id: concurrentManualOperationId,
      operationKey: `${actor!.id}:checkout:${concurrentManualOperationId}`,
      scopeKey: null,
      userId: actor!.id,
      provider: "stripe",
      operationType: "checkout",
      requestVersion: 1,
      requestHash: "admin-concurrent-manual-review",
      requestJson: '{"version":1,"payload":{}}',
      status: "manual_review",
      idempotencyMode: "local_only",
      attemptCount: 1,
      retryable: false,
      lastError: "concurrent administrator review",
      manualReviewCode: "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
      createdAt: deadLetteredAt,
      updatedAt: deadLetteredAt,
    });
    const jobId = crypto.randomUUID();
    const failedJobEventId = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(job).values({
        id: jobId,
        idempotencyKey: `admin-audit:${jobId}`,
        type: "ai.generate",
        ownerId: null,
        status: "failed",
        payload: { prompt: "test" },
        payloadHash: "admin-audit-test",
        result: null,
        error: "provider timeout",
        attemptCount: 3,
        maxAttempts: 3,
        runAfter: now,
        lockedAt: null,
        leaseToken: null,
        leaseUntil: null,
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(jobOutbox).values({
        id: crypto.randomUUID(),
        jobId,
        status: "published",
        leaseToken: null,
        leaseUntil: null,
        attempts: 1,
        lastError: null,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(failedJobEvent).values({
        id: failedJobEventId,
        queueMessageId: crypto.randomUUID(),
        jobId,
        jobType: "ai.generate",
        payload: { prompt: "test" },
        error: "provider timeout",
        attempts: 3,
        failedAt: now,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
        resolutionToken: null,
      }),
    ]);

    await expect(client.admin.getAccess()).resolves.toEqual({ isAdmin: true });
    await expect(client.admin.getUserSummary()).resolves.toMatchObject({
      users: expect.any(Number),
    });
    const integrations = await client.admin.getIntegrations();
    expect(integrations).toContainEqual(
      expect.objectContaining({ id: "d1", category: "infrastructure", status: "configured" }),
    );
    expect(JSON.stringify(integrations)).not.toContain("sk_test_module_check");
    expect(JSON.stringify(integrations)).not.toContain("whsec_module_check");
    expect(JSON.stringify(integrations)).not.toContain("test-revenuecat-webhook-secret");
    await expect(client.admin.getSystem()).resolves.toMatchObject({
      application: { templateVersion: expect.any(String), environment: expect.any(String) },
      modules: expect.arrayContaining([expect.objectContaining({ id: "admin", enabled: true })]),
      resources: expect.arrayContaining([
        expect.objectContaining({ id: "d1", status: "configured" }),
      ]),
    });
    await expect(client.admin.getMigrationStatus()).resolves.toMatchObject({
      available: expect.any(Boolean),
      applied: expect.any(Number),
    });
    await expect(client.admin.overview()).resolves.toMatchObject({
      stats: { users: expect.any(Number) },
    });
    const firstDeadLetterPage = await client.admin.listDeadLetterWebhooks({ limit: 1 });
    expect(firstDeadLetterPage.items).toHaveLength(1);
    expect(firstDeadLetterPage.nextCursor).not.toBeNull();
    const secondDeadLetterPage = await client.admin.listDeadLetterWebhooks({
      limit: 1,
      cursor: firstDeadLetterPage.nextCursor!,
    });
    expect(secondDeadLetterPage.items).toHaveLength(1);
    expect(secondDeadLetterPage.nextCursor).toBeNull();
    expect(
      new Set([
        firstDeadLetterPage.items[0]?.id,
        secondDeadLetterPage.items[0]?.id,
      ]),
    ).toEqual(new Set(deadLetterIds));
    await expect(
      client.admin.acknowledgeDeadLetterWebhook({ eventId: deadLetterIds[0]! }),
    ).resolves.toEqual({ acknowledged: true });
    await expect(
      client.admin.resolvePaymentOperationManualReview({
        operationId: manualOperationId,
        resolution: "mark_failed",
      }),
    ).resolves.toEqual({ resolved: true, reason: null });
    const concurrentResolutions = await Promise.all([
      client.admin.resolvePaymentOperationManualReview({
        operationId: concurrentManualOperationId,
        resolution: "mark_failed",
      }),
      client.admin.resolvePaymentOperationManualReview({
        operationId: concurrentManualOperationId,
        resolution: "mark_failed",
      }),
    ]);
    expect(concurrentResolutions.filter((result) => result.resolved)).toHaveLength(1);
    const failedResolution = concurrentResolutions.find((result) => !result.resolved);
    expect(failedResolution?.reason).toEqual(
      expect.stringMatching(/^(NOT_IN_MANUAL_REVIEW|STATUS_CHANGED)$/),
    );
    await expect(client.admin.retryFailedJob({ id: failedJobEventId })).resolves.toEqual({
      retried: true,
    });
    const auditLog = await client.admin.listAuditLog({ page: 1, perPage: 10 });
    expect(auditLog.total).toBe(5);
    expect(
      auditLog.data.filter(
        (entry) =>
          entry.action === "billing.payment-operation.manual-review-resolved" &&
          entry.entityId === concurrentManualOperationId,
      ),
    ).toHaveLength(1);
    expect(auditLog.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorEmail: "admin@example.test",
          action: "catalog.domain.updated",
          entityType: "domain",
          entityId: "domain-123",
          before: { status: "draft", apiToken: "[redacted]" },
          after: { status: "published" },
        }),
        expect.objectContaining({
          actorEmail: "admin@example.test",
          action: "jobs.failed.retried",
          entityType: "failed_job_event",
          entityId: failedJobEventId,
          before: null,
          after: { resolution: "retried" },
        }),
        expect.objectContaining({
          action: "billing.webhook.dead-letter-acknowledged",
          entityType: "billing_event",
          entityId: deadLetterIds[0],
          before: expect.objectContaining({
            processingStatus: "dead_letter",
            lastError: "manual review",
          }),
          after: { resolution: "acknowledged_without_replay" },
        }),
        expect.objectContaining({
          action: "billing.payment-operation.manual-review-resolved",
          entityType: "payment_operation",
          entityId: manualOperationId,
          before: {
            status: "manual_review",
            attemptCount: 1,
            manualReviewCode: "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
            lastError: "provider result ambiguous",
          },
          after: { resolution: "mark_failed" },
        }),
      ]),
    );
  });

  it("does not promote a paid user to administrator", async () => {
    const email = "paid@example.test";
    const client = await signUp(email);
    const account = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first<{
      id: string;
    }>();
    expect(account).not.toBeNull();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO billing_subscription (
          id, user_id, provider, provider_subscription_id, provider_customer_id,
          plan_id, price_id, status, cancel_at_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "paid-user-subscription",
        account?.id,
        "stripe",
        "paid-user-provider-subscription",
        "paid-user-provider-customer",
        "pro",
        "monthly",
        "active",
        0,
        now,
        now,
      )
      .run();

    await expect(client.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});

describe("purchase history", () => {
  it("returns only the signed-in user's safe payment history", async () => {
    await env.DB.prepare('DELETE FROM "rateLimit"').run();
    const email = `purchases-${crypto.randomUUID()}@example.test`;
    const client = await signUp(email);
    const account = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first<{
      id: string;
    }>();
    expect(account?.id).toBeTruthy();
    const now = new Date();
    const db = createDb(env.DB);
    await db.batch([
      db.insert(billingSubscription).values({
        id: crypto.randomUUID(),
        userId: account!.id,
        provider: "stripe",
        providerSubscriptionId: "sub_private_history",
        providerCustomerId: "cus_private_history",
        planId: "pro",
        priceId: "price_private_history",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        startedAt: now,
        endedAt: null,
        providerEventAt: now,
        providerEventId: "evt_private_history",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(billingPurchase).values({
        id: crypto.randomUUID(),
        userId: account!.id,
        provider: "stripe",
        providerPaymentIntentId: "pi_private_history",
        planId: "lifetime",
        priceId: "price_private_history",
        status: "succeeded",
        paidAt: now,
        providerEventAt: now,
        providerEventId: "evt_private_history_purchase",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(creditOrder).values({
        id: crypto.randomUUID(),
        userId: account!.id,
        packageId: "starter",
        provider: "stripe",
        providerSessionId: "cs_private_history",
        providerPaymentId: "pi_private_credit_history",
        status: "completed",
        creditAmount: 100,
        amountCents: 499,
        currency: "usd",
        ledgerTransactionId: null,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    const history = await client.payments.listPurchaseHistory();
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "subscription", label: "pro", amountCents: null }),
        expect.objectContaining({ type: "membership", label: "lifetime", amountCents: null }),
        expect.objectContaining({
          type: "credits",
          label: "starter",
          amountCents: 499,
          currency: "usd",
        }),
      ]),
    );
    expect(JSON.stringify(history)).not.toContain("private_history");
    const firstPage = await client.payments.listPurchaseHistoryPage({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await client.payments.listPurchaseHistoryPage({
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
    expect(
      [...firstPage.items, ...secondPage.items].map((item) => `${item.type}:${item.label}`),
    ).toEqual(["subscription:pro", "membership:lifetime", "credits:starter"]);
  });
});
