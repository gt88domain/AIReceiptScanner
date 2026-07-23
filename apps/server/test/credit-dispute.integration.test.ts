import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  beginBillableOperation,
  completeCreditOrderPurchase,
  getBalance,
  recordCreditPaymentDispute,
} from "@/credits";
import { createDb } from "@/db";
import { creditOrder } from "@/db/schema/credits";
import { productFeatures } from "@/lib/module-config";

const db = createDb(env.DB);

async function createUser() {
  const email = `credit-dispute-${crypto.randomUUID()}@example.test`;
  const response = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Credit Dispute Test", password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const user = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  expect(user?.id).toBeTruthy();
  return { userId: user!.id };
}

async function createCompletedOrder(user: { userId: string }, suffix: string) {
  const now = new Date();
  const orderId = `order-${suffix}`;
  const paymentId = `pi-${suffix}`;
  await db.insert(creditOrder).values({
    id: orderId,
    userId: user.userId,
    packageId: "test-package",
    provider: "stripe",
    providerSessionId: null,
    providerPaymentId: null,
    status: "pending",
    creditAmount: 10,
    amountCents: 499,
    currency: "usd",
    ledgerTransactionId: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await completeCreditOrderPurchase(db, {
    orderId,
    sourceProvider: "stripe",
    sourceId: paymentId,
    providerPaymentId: paymentId,
    providerAmountCents: 499,
    providerCurrency: "usd",
  });
  return { orderId, paymentId };
}

describe.skipIf(!productFeatures.credits)("credit payment disputes", () => {
  it("holds a lost chargeback account and records debt even after credits were consumed", async () => {
    const user = await createUser();
    const { paymentId } = await createCompletedOrder(user, crypto.randomUUID());
    await beginBillableOperation(db, {
      user,
      feature: "image.generate",
      operationId: crypto.randomUUID(),
      requestHash: "a".repeat(64),
      calculatedCost: 10,
    });
    await expect(getBalance(db, user)).resolves.toMatchObject({ balance: 0 });

    const dispute = {
      provider: "stripe",
      providerDisputeId: crypto.randomUUID(),
      providerPaymentId: paymentId,
      status: "lost",
      amountCents: 499,
      currency: "usd",
      providerEventAt: new Date(),
      providerEventId: crypto.randomUUID(),
    } as const;
    await recordCreditPaymentDispute(db, dispute);
    await recordCreditPaymentDispute(db, dispute);

    await expect(getBalance(db, user)).resolves.toMatchObject({ balance: -10, totalRevoked: 10 });
    await expect(
      beginBillableOperation(db, {
        user,
        feature: "image.generate",
        operationId: crypto.randomUUID(),
        requestHash: "b".repeat(64),
        calculatedCost: 1,
      }),
    ).rejects.toThrow("billing hold");
  });

  it("releases an open dispute hold when the provider rules in the user's favor", async () => {
    const user = await createUser();
    const { paymentId } = await createCompletedOrder(user, crypto.randomUUID());
    const disputeId = crypto.randomUUID();
    const openedAt = new Date("2026-07-22T10:00:00.000Z");
    await recordCreditPaymentDispute(db, {
      provider: "stripe",
      providerDisputeId: disputeId,
      providerPaymentId: paymentId,
      status: "open",
      amountCents: 499,
      currency: "usd",
      providerEventAt: openedAt,
      providerEventId: "evt-open",
    });
    await expect(
      beginBillableOperation(db, {
        user,
        feature: "image.generate",
        operationId: crypto.randomUUID(),
        requestHash: "c".repeat(64),
        calculatedCost: 1,
      }),
    ).rejects.toThrow("billing hold");

    await recordCreditPaymentDispute(db, {
      provider: "stripe",
      providerDisputeId: disputeId,
      providerPaymentId: paymentId,
      status: "won",
      amountCents: 499,
      currency: "usd",
      providerEventAt: new Date("2026-07-22T10:01:00.000Z"),
      providerEventId: "evt-won",
    });
    await expect(
      beginBillableOperation(db, {
        user,
        feature: "image.generate",
        operationId: crypto.randomUUID(),
        requestHash: "d".repeat(64),
        calculatedCost: 1,
      }),
    ).resolves.toMatchObject({ kind: "started" });
  });
});
