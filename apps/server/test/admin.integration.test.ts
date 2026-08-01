import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { createDb } from "@/db";
import { failedJobEvent, job } from "@/db/schema/jobs";
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
        startedAt: now,
        completedAt: now,
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
      }),
    ]);

    await expect(client.admin.getAccess()).resolves.toEqual({ isAdmin: true });
    await expect(client.admin.overview()).resolves.toMatchObject({
      stats: { users: expect.any(Number) },
    });
    await expect(client.admin.retryFailedJob({ id: failedJobEventId })).resolves.toEqual({
      retried: true,
    });
    const auditLog = await client.admin.listAuditLog({ page: 1, perPage: 10 });
    expect(auditLog.total).toBe(2);
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
