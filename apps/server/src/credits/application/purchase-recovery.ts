import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  creditAccount,
  creditOrder,
  creditPurchaseRecoveryEvent,
  creditTransaction,
} from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  ensureCreditAccount,
  findTransactionBySource,
  runCreditBatch,
} from "./internal";
import type { ApplyCreditPurchaseRecoveryInput } from "./types";

const MAX_RECOVERY_ATTEMPTS = 3;

function createRecoveryVersionGuard(db: Database, orderId: string) {
  return db.insert(creditOrder).select((qb) =>
    qb
      .select({
        id: creditOrder.id,
        userId: creditOrder.userId,
        packageId: creditOrder.packageId,
        provider: creditOrder.provider,
        providerSessionId: creditOrder.providerSessionId,
        providerPaymentId: creditOrder.providerPaymentId,
        status: creditOrder.status,
        creditAmount: creditOrder.creditAmount,
        amountCents: creditOrder.amountCents,
        currency: creditOrder.currency,
        ledgerTransactionId: creditOrder.ledgerTransactionId,
        expiresAt: creditOrder.expiresAt,
        recoveredAmountCents: creditOrder.recoveredAmountCents,
        recoveredCreditAmount: creditOrder.recoveredCreditAmount,
        recoveredSpendableAmount: creditOrder.recoveredSpendableAmount,
        recoveryVersion: creditOrder.recoveryVersion,
        recoveryMode: creditOrder.recoveryMode,
        createdAt: creditOrder.createdAt,
        updatedAt: creditOrder.updatedAt,
      })
      .from(creditOrder)
      .where(and(eq(creditOrder.id, orderId), sql`changes() <> 1`)),
  );
}

function isNewerEvent(
  existing: { providerEventAt: Date | null; providerEventId: string | null },
  input: ApplyCreditPurchaseRecoveryInput,
) {
  if (!existing.providerEventAt || !input.providerEventAt) return true;
  if (existing.providerEventAt.getTime() !== input.providerEventAt.getTime()) {
    return existing.providerEventAt < input.providerEventAt;
  }
  return (existing.providerEventId ?? "") < (input.providerEventId ?? "");
}

function isRecoveryVersionConflict(error: unknown) {
  return (
    error instanceof Error && error.message.includes("UNIQUE constraint failed: credit_order.id")
  );
}

/**
 * Applies one verified provider recovery fact and its aggregate ledger delta.
 * The recovery event remains the source of truth; the ledger records only balance changes.
 */
export async function applyCreditPurchaseRecovery(
  db: Database,
  input: ApplyCreditPurchaseRecoveryInput,
) {
  assertCreditsEnabled();
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Credit recovery amount must be a positive integer");
  }
  const currency = input.currency.toLowerCase();

  for (let attempt = 0; attempt < MAX_RECOVERY_ATTEMPTS; attempt++) {
    const [order] = await db
      .select()
      .from(creditOrder)
      .where(
        and(
          eq(creditOrder.provider, input.provider),
          eq(creditOrder.providerPaymentId, input.providerPaymentId),
        ),
      )
      .limit(1);
    if (!order) return null;
    if (order.recoveryMode !== "exact") {
      throw new Error("CREDIT_RECOVERY_LEGACY_REVIEW_REQUIRED");
    }
    if (order.currency.toLowerCase() !== currency) {
      throw new Error("Credit recovery currency does not match the purchase");
    }

    const [existing] = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(
        and(
          eq(creditPurchaseRecoveryEvent.provider, input.provider),
          eq(creditPurchaseRecoveryEvent.recoveryType, input.recoveryType),
          eq(creditPurchaseRecoveryEvent.providerRecoveryId, input.providerRecoveryId),
        ),
      )
      .limit(1);
    if (existing && !isNewerEvent(existing, input))
      return { order, event: existing, changed: false };

    const events = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(eq(creditPurchaseRecoveryEvent.creditOrderId, order.id));
    const eventId = existing?.id ?? crypto.randomUUID();
    const projectedEvents = [
      ...events.filter((event) => event.id !== eventId),
      {
        id: eventId,
        state: input.state,
        amountCents: input.amountCents,
      },
    ];
    const recoveredAmountCents = Math.min(
      order.amountCents,
      projectedEvents
        .filter((event) => event.state === "active")
        .reduce((sum, event) => sum + event.amountCents, 0),
    );
    const recoveredCreditAmount = Math.min(
      order.creditAmount,
      Math.ceil((order.creditAmount * recoveredAmountCents) / order.amountCents),
    );
    const creditDelta = recoveredCreditAmount - order.recoveredCreditAmount;
    const now = new Date();
    const purchase = await findTransactionBySource(db, {
      sourceProvider: input.provider,
      sourceType: "purchase",
      sourceId: input.providerPaymentId,
    });
    if (!purchase || purchase.userId !== order.userId) {
      throw new Error("Credit recovery purchase grant not found");
    }

    const spendableDelta = creditDelta > 0 ? Math.min(purchase.remainingAmount, creditDelta) : 0;
    const debtComponent = order.recoveredCreditAmount - order.recoveredSpendableAmount;
    const restoreSpendable = creditDelta < 0 ? Math.max(0, -creditDelta - debtComponent) : 0;
    const nextSpendableAmount = order.recoveredSpendableAmount + spendableDelta - restoreSpendable;
    const nextStatus = recoveredAmountCents >= order.amountCents ? "refunded" : "completed";
    const ledgerSourceId = `${eventId}:${order.recoveryVersion + 1}`;

    const orderUpdate = db
      .update(creditOrder)
      .set({
        status: nextStatus,
        recoveredAmountCents,
        recoveredCreditAmount,
        recoveredSpendableAmount: nextSpendableAmount,
        recoveryVersion: order.recoveryVersion + 1,
        updatedAt: now,
      })
      .where(
        and(eq(creditOrder.id, order.id), eq(creditOrder.recoveryVersion, order.recoveryVersion)),
      )
      .returning({ id: creditOrder.id });
    const eventWrite = db
      .insert(creditPurchaseRecoveryEvent)
      .values({
        id: eventId,
        creditOrderId: order.id,
        userId: order.userId,
        provider: input.provider,
        recoveryType: input.recoveryType,
        providerRecoveryId: input.providerRecoveryId,
        providerPaymentId: input.providerPaymentId,
        state: input.state,
        amountCents: input.amountCents,
        currency,
        providerEventAt: input.providerEventAt ?? null,
        providerEventId: input.providerEventId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          creditPurchaseRecoveryEvent.provider,
          creditPurchaseRecoveryEvent.recoveryType,
          creditPurchaseRecoveryEvent.providerRecoveryId,
        ],
        set: {
          state: input.state,
          amountCents: input.amountCents,
          currency,
          providerPaymentId: input.providerPaymentId,
          providerEventAt: input.providerEventAt ?? null,
          providerEventId: input.providerEventId ?? null,
          updatedAt: now,
        },
      });

    await ensureCreditAccount(db, order.userId);
    const batch = [eventWrite] as Parameters<typeof runCreditBatch>[1];
    if (creditDelta > 0) {
      batch.push(
        db
          .update(creditTransaction)
          .set({
            remainingAmount: sql`${creditTransaction.remainingAmount} - ${spendableDelta}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(creditTransaction.id, purchase.id),
              gte(creditTransaction.remainingAmount, spendableDelta),
            ),
          ),
        db
          .update(creditAccount)
          .set({
            balance: sql`${creditAccount.balance} - ${creditDelta}`,
            totalRevoked: sql`${creditAccount.totalRevoked} + ${creditDelta}`,
            updatedAt: now,
          })
          .where(eq(creditAccount.userId, order.userId)),
        db.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          amount: -creditDelta,
          remainingAmount: 0,
          sourceProvider: input.provider,
          sourceType: input.recoveryType,
          sourceId: ledgerSourceId,
          packageId: purchase.packageId,
          expiresAt: null,
          metadata: {
            creditOrderId: order.id,
            recoveryEventId: eventId,
            providerRecoveryId: input.providerRecoveryId,
            providerEventId: input.providerEventId ?? "",
            targetRecoveredAmountCents: recoveredAmountCents,
            targetRecoveredCreditAmount: recoveredCreditAmount,
            spendableDelta,
          },
          createdAt: now,
          updatedAt: now,
        }),
      );
    } else if (creditDelta < 0) {
      const restoreDelta = -creditDelta;
      batch.push(
        db
          .update(creditTransaction)
          .set({
            remainingAmount: sql`${creditTransaction.remainingAmount} + ${restoreSpendable}`,
            updatedAt: now,
          })
          .where(eq(creditTransaction.id, purchase.id)),
        db
          .update(creditAccount)
          .set({
            balance: sql`${creditAccount.balance} + ${restoreDelta}`,
            totalRestored: sql`${creditAccount.totalRestored} + ${restoreDelta}`,
            updatedAt: now,
          })
          .where(eq(creditAccount.userId, order.userId)),
        db.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          amount: restoreDelta,
          remainingAmount: 0,
          sourceProvider: input.provider,
          sourceType: "recovery_reversal",
          sourceId: ledgerSourceId,
          packageId: purchase.packageId,
          expiresAt: null,
          metadata: {
            creditOrderId: order.id,
            recoveryEventId: eventId,
            providerRecoveryId: input.providerRecoveryId,
            providerEventId: input.providerEventId ?? "",
            targetRecoveredAmountCents: recoveredAmountCents,
            targetRecoveredCreditAmount: recoveredCreditAmount,
            spendableDelta: restoreSpendable,
          },
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    batch.push(orderUpdate, createRecoveryVersionGuard(db, order.id));
    try {
      await runCreditBatch(db, batch);
    } catch (error) {
      // The final guard deliberately collides only when the versioned order update changed no row.
      // D1 rolls the entire batch back, so the next loop can recompute from the newer aggregate.
      if (isRecoveryVersionConflict(error)) continue;
      throw error;
    }
    const [event] = await db
      .select()
      .from(creditPurchaseRecoveryEvent)
      .where(eq(creditPurchaseRecoveryEvent.id, eventId))
      .limit(1);
    return {
      order: { ...order, recoveredAmountCents, recoveredCreditAmount },
      event: event!,
      changed: true,
    };
  }
  throw new Error("CREDIT_RECOVERY_CONFLICT");
}
