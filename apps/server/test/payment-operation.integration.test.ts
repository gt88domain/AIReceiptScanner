import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { billingCheckoutSession, paymentOperation } from "@/db/schema/payments";
import {
  claimPaymentOperation,
  failPaymentOperation,
  getOrCreatePaymentOperation,
  resolvePaymentOperationManualReview,
  retryPaymentOperation,
} from "@/payments/application/payment-operation";
import { reconcilePaymentOperations } from "@/payments/application/payment-operation-recovery";
import { PaymentProviderRequestError } from "@/payments/public/types";

describe("payment operation scope ownership", () => {
  it("finalizes a provider success without a second provider call", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Recovery",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "recovery-hash",
      requestJson:
        '{"version":1,"payload":{"planId":"pro","priceId":"monthly","mode":"subscription"}}',
      idempotencyMode: "native",
      relatedResourceType: "checkout_session",
    });
    await db
      .update(paymentOperation)
      .set({
        status: "provider_succeeded",
        providerResourceId: "cs_recovered",
        resultJson:
          '{"providerSessionId":"cs_recovered","url":"https://checkout.example.test/session","expiresAt":null}',
        updatedAt: now,
      })
      .where(eq(paymentOperation.id, operation.id));
    await expect(reconcilePaymentOperations(db, now)).resolves.toBe(1);
    const [session] = await db
      .select()
      .from(billingCheckoutSession)
      .where(eq(billingCheckoutSession.id, operation.id));
    const [completed] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, operation.id));
    expect(session).toMatchObject({ providerSessionId: "cs_recovered" });
    expect(completed).toMatchObject({ status: "completed" });
  });

  it("allows only one active subscription mutation per provider subscription", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Payment Operation Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const base = {
      userId,
      provider: "stripe" as const,
      operationType: "subscription_upgrade" as const,
      requestHash: "request-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "native" as const,
      scopeKey: `subscription:stripe:${crypto.randomUUID()}`,
      relatedResourceType: "subscription" as const,
      relatedResourceId: crypto.randomUUID(),
    };
    const operationId = crypto.randomUUID();
    await getOrCreatePaymentOperation(db, { ...base, operationId });
    await expect(
      getOrCreatePaymentOperation(db, {
        ...base,
        operationId,
        requestHash: "different-request-hash",
      }),
    ).rejects.toThrow("PAYMENT_OPERATION_REQUEST_MISMATCH");
    const racedScopeKey = `subscription:stripe:${crypto.randomUUID()}`;
    const concurrent = await Promise.allSettled(
      [crypto.randomUUID(), crypto.randomUUID()].map((concurrentOperationId) =>
        getOrCreatePaymentOperation(db, {
          ...base,
          operationId: concurrentOperationId,
          scopeKey: racedScopeKey,
        }),
      ),
    );
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("fences simultaneous stale lease claims and uses bounded exponential retries", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Lease Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "lease-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "native",
    });
    await db
      .update(paymentOperation)
      .set({ status: "processing", leaseUntil: new Date(now.getTime() - 1) })
      .where(eq(paymentOperation.id, operation.id));
    const [first, second] = await Promise.all([
      claimPaymentOperation(
        db,
        { ...operation, status: "processing", leaseUntil: new Date(now.getTime() - 1) },
        now,
      ),
      claimPaymentOperation(
        db,
        { ...operation, status: "processing", leaseUntil: new Date(now.getTime() - 1) },
        now,
      ),
    ]);
    const claim = first ?? second;
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(claim).toBeDefined();
    await failPaymentOperation(db, operation.id, claim!.token, new Error("retry"), false, now);
    const [failed] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, operation.id));
    expect(failed).toMatchObject({ status: "failed", attemptCount: 1, retryable: true });
    expect(failed.nextRetryAt?.getTime()).toBeGreaterThanOrEqual(now.getTime() + 59_000);
    expect(failed.nextRetryAt?.getTime()).toBeLessThanOrEqual(now.getTime() + 60_000);
  });

  it("moves an expired local-only provider lease to manual review", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Local Lease Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "local-lease-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "local_only",
    });
    await db
      .update(paymentOperation)
      .set({ status: "processing", leaseUntil: new Date(now.getTime() - 1) })
      .where(eq(paymentOperation.id, operation.id));
    await expect(reconcilePaymentOperations(db, now)).resolves.toBe(0);
    const [review] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, operation.id));
    expect(review).toMatchObject({
      status: "manual_review",
      manualReviewCode: "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
    });
  });

  it("never automatically retries a provider-confirmed rejection", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Rejected Payment Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "rejected-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "native",
    });
    const claim = await claimPaymentOperation(db, operation, now);
    expect(claim).toBeDefined();
    await failPaymentOperation(
      db,
      operation.id,
      claim!.token,
      new PaymentProviderRequestError("Provider rejected the request", "definitely_failed"),
      false,
      now,
    );
    const [failed] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, operation.id));
    expect(failed).toMatchObject({ status: "failed", retryable: false, nextRetryAt: null });
    await expect(retryPaymentOperation(db, operation.id, now)).resolves.toBe(false);
  });

  it("isolates expired provider retries without aborting later recovery work", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date("2026-08-10T12:00:00.000Z");
    await db.insert(user).values({
      id: userId,
      name: "Expired Retry Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const expired = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "expired-retry-hash",
      requestJson: '{"version":1,"payload":{"planId":"pro","priceId":"monthly","mode":"subscription"}}',
      idempotencyMode: "native",
      relatedResourceType: "checkout_session",
    });
    await db
      .update(paymentOperation)
      .set({
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      })
      .where(eq(paymentOperation.id, expired.id));
    const finalizable = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "later-finalization-hash",
      requestJson: '{"version":1,"payload":{"planId":"pro","priceId":"monthly","mode":"subscription"}}',
      idempotencyMode: "native",
      relatedResourceType: "checkout_session",
    });
    await db
      .update(paymentOperation)
      .set({
        status: "provider_succeeded",
        providerResourceId: "cs_later",
        resultJson:
          '{"providerSessionId":"cs_later","url":"https://checkout.example.test/later","expiresAt":null}',
      })
      .where(eq(paymentOperation.id, finalizable.id));

    await expect(reconcilePaymentOperations(db, now)).resolves.toBe(1);
    const [isolated] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, expired.id));
    const [completed] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, finalizable.id));
    expect(isolated).toMatchObject({
      status: "manual_review",
      manualReviewCode: "PAYMENT_OPERATION_IDEMPOTENCY_WINDOW_EXPIRED",
    });
    expect(completed).toMatchObject({ status: "completed" });
  });

  it("resolves manual review only within safe idempotency and scope boundaries", async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Manual Review Test",
      email: `${userId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const native = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "manual-native-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "native",
    });
    await db
      .update(paymentOperation)
      .set({ status: "manual_review", attemptCount: 4, manualReviewCode: "MAX_ATTEMPTS" })
      .where(eq(paymentOperation.id, native.id));
    await expect(
      resolvePaymentOperationManualReview(db, native.id, "requeue", now),
    ).resolves.toMatchObject({ resolved: true, reason: null });
    const [requeued] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.id, native.id));
    expect(requeued).toMatchObject({ status: "pending", attemptCount: 0 });

    const localOnly = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId: crypto.randomUUID(),
      requestHash: "manual-local-hash",
      requestJson: '{"version":1,"payload":{}}',
      idempotencyMode: "local_only",
    });
    await db
      .update(paymentOperation)
      .set({ status: "manual_review", manualReviewCode: "AMBIGUOUS" })
      .where(eq(paymentOperation.id, localOnly.id));
    await expect(
      resolvePaymentOperationManualReview(db, localOnly.id, "requeue", now),
    ).resolves.toEqual({ resolved: false, reason: "UNSAFE_NON_IDEMPOTENT_RETRY" });
  });
});
