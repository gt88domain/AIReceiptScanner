import { env, exports } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import {
  beginBillableOperation,
  auditLegacyCreditRecoveries,
  completeCreditOrderPurchase,
  getBalance,
  recordCreditPaymentDispute,
  revokeCreditPurchaseBySource,
} from "@/credits";
import { applyCreditPurchaseRecovery } from "@/credits/application/purchase-recovery";
import { createDb } from "@/db";
import {
  creditAccount,
  creditOrder,
  creditPurchaseRecoveryEvent,
  creditTransaction,
} from "@/db/schema/credits";
import { productFeatures } from "@/lib/module-config";

const db = createDb(env.DB);

async function createUser() {
  const ipOctet = crypto.getRandomValues(new Uint8Array(1))[0] || 1;
  const email = `credit-dispute-${crypto.randomUUID()}@example.test`;
  const response = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Credit Dispute Test", password: "test-password-123" }),
    headers: {
      "CF-Connecting-IP": `198.51.100.${ipOctet}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const user = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  expect(user?.id).toBeTruthy();
  return { userId: user!.id };
}

async function createCompletedOrder(
  user: { userId: string },
  suffix: string,
  { amountCents = 499, creditAmount = 10 } = {},
) {
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
    creditAmount,
    amountCents,
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
    providerAmountCents: amountCents,
    providerCurrency: "usd",
  });
  return { orderId, paymentId };
}

describe.skipIf(!productFeatures.credits)("credit payment disputes", () => {
  it("does not treat incomplete historical recovery data as safe for automatic restoration", async () => {
    const user = await createUser();
    const { orderId, paymentId } = await createCompletedOrder(user, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const now = new Date("2026-08-05T00:00:00.000Z");
    await db.insert(creditTransaction).values({
      id: crypto.randomUUID(),
      userId: user.userId,
      amount: -100,
      remainingAmount: 0,
      sourceProvider: "stripe",
      sourceType: "refund",
      sourceId: `legacy-refund-${paymentId}`,
      packageId: null,
      expiresAt: null,
      metadata: { originalSourceId: paymentId },
      createdAt: now,
      updatedAt: now,
    });

    await auditLegacyCreditRecoveries(db);
    const [order] = await db
      .select({
        recoveryMode: creditOrder.recoveryMode,
        recoveredCreditAmount: creditOrder.recoveredCreditAmount,
      })
      .from(creditOrder)
      .where(eq(creditOrder.id, orderId));
    expect(order).toMatchObject({ recoveryMode: "legacy_review", recoveredCreditAmount: 0 });
  });

  it("rebuilds exact historical full refunds and chargebacks but quarantines mixed recovery", async () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const refundUser = await createUser();
    const refund = await createCompletedOrder(refundUser, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const chargebackUser = await createUser();
    const chargeback = await createCompletedOrder(chargebackUser, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const mixedUser = await createUser();
    const mixed = await createCompletedOrder(mixedUser, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    for (const { userId, paymentId } of [
      { userId: refundUser.userId, paymentId: refund.paymentId },
      { userId: chargebackUser.userId, paymentId: chargeback.paymentId },
      { userId: mixedUser.userId, paymentId: mixed.paymentId },
    ]) {
      await db
        .update(creditTransaction)
        .set({ remainingAmount: 0, updatedAt: now })
        .where(
          and(
            eq(creditTransaction.userId, userId),
            eq(creditTransaction.sourceType, "purchase"),
            eq(creditTransaction.sourceId, paymentId),
          ),
        );
    }
    await db.insert(creditTransaction).values([
      {
        id: crypto.randomUUID(),
        userId: refundUser.userId,
        amount: -100,
        remainingAmount: 0,
        sourceProvider: "stripe",
        sourceType: "refund",
        sourceId: `legacy-refund-${refund.paymentId}`,
        packageId: null,
        expiresAt: null,
        metadata: { originalSourceId: refund.paymentId, amountRefunded: 1000 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        userId: chargebackUser.userId,
        amount: -100,
        remainingAmount: 0,
        sourceProvider: "stripe",
        sourceType: "chargeback",
        sourceId: `legacy-chargeback-${chargeback.paymentId}`,
        packageId: null,
        expiresAt: null,
        metadata: { originalSourceId: chargeback.paymentId, disputedAmountCents: 1000 },
        createdAt: now,
        updatedAt: now,
      },
      ...(["refund", "chargeback"] as const).map((sourceType) => ({
        id: crypto.randomUUID(),
        userId: mixedUser.userId,
        amount: -50,
        remainingAmount: 0,
        sourceProvider: "stripe" as const,
        sourceType,
        sourceId: `legacy-${sourceType}-${mixed.paymentId}`,
        packageId: null,
        expiresAt: null,
        metadata:
          sourceType === "refund"
            ? {
                originalSourceId: mixed.paymentId,
                amountRefunded: 500,
                disputedAmountCents: null,
              }
            : {
                originalSourceId: mixed.paymentId,
                amountRefunded: null,
                disputedAmountCents: 500,
              },
        createdAt: now,
        updatedAt: now,
      })),
    ]);

    await expect(auditLegacyCreditRecoveries(db)).resolves.toBeDefined();
    const audited = await db
      .select({
        id: creditOrder.id,
        recoveryMode: creditOrder.recoveryMode,
        recovered: creditOrder.recoveredCreditAmount,
      })
      .from(creditOrder)
      .where(eq(creditOrder.id, refund.orderId));
    const [refundEvent] = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(eq(creditPurchaseRecoveryEvent.creditOrderId, refund.orderId));
    const [chargebackOrder] = await db
      .select()
      .from(creditOrder)
      .where(eq(creditOrder.id, chargeback.orderId));
    const [mixedOrder] = await db
      .select()
      .from(creditOrder)
      .where(eq(creditOrder.id, mixed.orderId));
    expect(audited[0]).toMatchObject({ recoveryMode: "exact", recovered: 100 });
    expect(refundEvent).toMatchObject({ recoveryType: "refund", amountCents: 1000 });
    expect(chargebackOrder).toMatchObject({ recoveryMode: "exact", recoveredCreditAmount: 100 });
    expect(mixedOrder).toMatchObject({ recoveryMode: "legacy_review", recoveredCreditAmount: 0 });
  });

  it("marks historical orders without recovery rows as exact", async () => {
    const user = await createUser();
    const { orderId } = await createCompletedOrder(user, crypto.randomUUID());
    await auditLegacyCreditRecoveries(db);
    const [order] = await db.select().from(creditOrder).where(eq(creditOrder.id, orderId));
    expect(order).toMatchObject({ recoveryMode: "exact", recoveredCreditAmount: 0 });
  });

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

  it("caps cumulative refund and chargeback recovery at the purchased credits", async () => {
    const user = await createUser();
    const { paymentId } = await createCompletedOrder(user, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    await recordCreditPaymentDispute(db, {
      provider: "stripe",
      providerDisputeId: crypto.randomUUID(),
      providerPaymentId: paymentId,
      status: "lost",
      amountCents: 600,
      currency: "usd",
      providerEventAt: new Date(),
      providerEventId: crypto.randomUUID(),
    });
    await revokeCreditPurchaseBySource(db, {
      originalSourceProvider: "stripe",
      originalSourceId: paymentId,
      refundSourceId: crypto.randomUUID(),
      recoverySourceType: "refund",
    });

    await expect(getBalance(db, user)).resolves.toMatchObject({
      balance: 0,
      totalRevoked: 100,
    });
  });

  it("retries a same-version recovery conflict without partial money writes", async () => {
    const user = await createUser();
    const { orderId, paymentId } = await createCompletedOrder(user, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const now = new Date("2026-08-06T12:00:00.000Z");
    const originalBatch = db.batch.bind(db);
    let reachedBatch = 0;
    let release: () => void = () => {};
    const bothReadVersion = new Promise<void>((resolve) => {
      release = resolve;
    });
    const batch = vi.spyOn(db, "batch").mockImplementation(async (...args) => {
      if (reachedBatch < 2) {
        reachedBatch += 1;
        if (reachedBatch === 2) release();
        await bothReadVersion;
      }
      return originalBatch(...args);
    });
    try {
      await Promise.all([
        applyCreditPurchaseRecovery(db, {
          provider: "stripe",
          providerPaymentId: paymentId,
          recoveryType: "refund",
          providerRecoveryId: "recovery-refund",
          state: "active",
          amountCents: 600,
          currency: "usd",
          providerEventAt: now,
          providerEventId: "evt-refund",
        }),
        applyCreditPurchaseRecovery(db, {
          provider: "stripe",
          providerPaymentId: paymentId,
          recoveryType: "chargeback",
          providerRecoveryId: "recovery-chargeback",
          state: "active",
          amountCents: 1000,
          currency: "usd",
          providerEventAt: now,
          providerEventId: "evt-chargeback",
        }),
      ]);
    } finally {
      batch.mockRestore();
    }
    expect(reachedBatch).toBe(2);
    const [order] = await db.select().from(creditOrder).where(eq(creditOrder.id, orderId));
    const [account] = await db
      .select()
      .from(creditAccount)
      .where(eq(creditAccount.userId, user.userId));
    const [purchase] = await db
      .select()
      .from(creditTransaction)
      .where(
        and(
          eq(creditTransaction.sourceType, "purchase"),
          eq(creditTransaction.sourceId, paymentId),
        ),
      );
    const events = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(eq(creditPurchaseRecoveryEvent.creditOrderId, orderId));
    const ledger = await db
      .select()
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, user.userId));
    expect(order).toMatchObject({
      recoveryVersion: 2,
      recoveredAmountCents: 1000,
      recoveredCreditAmount: 100,
      recoveredSpendableAmount: 100,
    });
    expect(account).toMatchObject({ balance: 0, totalRevoked: 100 });
    expect(purchase).toMatchObject({ remainingAmount: 0 });
    expect(events).toHaveLength(2);
    expect(
      ledger.filter((entry) => entry.sourceType === "refund" || entry.sourceType === "chargeback"),
    ).toHaveLength(2);
  });

  it("treats a later recovery amount as the provider's absolute fact", async () => {
    const user = await createUser();
    const { orderId, paymentId } = await createCompletedOrder(user, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const recovery = {
      provider: "stripe" as const,
      providerPaymentId: paymentId,
      recoveryType: "refund" as const,
      providerRecoveryId: "refund-absolute-amount",
      state: "active" as const,
      currency: "usd",
      providerEventId: "evt-refund-absolute",
    };
    await applyCreditPurchaseRecovery(db, {
      ...recovery,
      amountCents: 300,
      providerEventAt: new Date("2026-08-06T13:00:00.000Z"),
    });
    await applyCreditPurchaseRecovery(db, {
      ...recovery,
      amountCents: 600,
      providerEventAt: new Date("2026-08-06T13:01:00.000Z"),
    });
    const [order] = await db.select().from(creditOrder).where(eq(creditOrder.id, orderId));
    const [account] = await db
      .select()
      .from(creditAccount)
      .where(eq(creditAccount.userId, user.userId));
    const events = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(eq(creditPurchaseRecoveryEvent.creditOrderId, orderId));
    expect(order).toMatchObject({ recoveredAmountCents: 600, recoveredCreditAmount: 60 });
    expect(account).toMatchObject({ balance: 40, totalRevoked: 60 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ amountCents: 600, state: "active" });
  });

  it("reverses a lost dispute when it is won and no other recovery remains active", async () => {
    const user = await createUser();
    const { paymentId } = await createCompletedOrder(user, crypto.randomUUID(), {
      amountCents: 1000,
      creditAmount: 100,
    });
    const disputeId = crypto.randomUUID();
    const lostAt = new Date("2026-08-06T00:00:00.000Z");
    await recordCreditPaymentDispute(db, {
      provider: "stripe",
      providerDisputeId: disputeId,
      providerPaymentId: paymentId,
      status: "lost",
      amountCents: 1000,
      currency: "usd",
      providerEventAt: lostAt,
      providerEventId: "evt-lost",
    });
    await recordCreditPaymentDispute(db, {
      provider: "stripe",
      providerDisputeId: disputeId,
      providerPaymentId: paymentId,
      status: "won",
      amountCents: 1000,
      currency: "usd",
      providerEventAt: new Date("2026-08-06T00:01:00.000Z"),
      providerEventId: "evt-won",
    });

    await expect(getBalance(db, user)).resolves.toMatchObject({ balance: 100, totalRevoked: 100 });
  });
});
