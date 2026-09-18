import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder, creditPurchaseRecoveryEvent, creditTransaction } from "@/db/schema/credits";

type RecoveryMetadata = {
  originalSourceId?: string;
  amountRefunded?: number;
  disputedAmountCents?: number;
};

function asRecoveryMetadata(value: unknown): RecoveryMetadata {
  return value && typeof value === "object" ? (value as RecoveryMetadata) : {};
}

/**
 * Rebuilds only historical recovery state that can be proven from v0.4.8 ledger
 * facts. Ambiguous rows are deliberately quarantined as legacy_review.
 */
export async function auditLegacyCreditRecoveries(db: Database) {
  const orders = await db.select().from(creditOrder);
  let exact = 0;
  let legacyReview = 0;
  for (const order of orders) {
    if (!order.providerPaymentId) continue;
    const transactions = await db
      .select()
      .from(creditTransaction)
      .where(
        and(
          eq(creditTransaction.userId, order.userId),
          inArray(creditTransaction.sourceType, ["refund", "chargeback"]),
        ),
      );
    const recoveryRows = transactions.filter(
      (transaction) =>
        asRecoveryMetadata(transaction.metadata).originalSourceId === order.providerPaymentId,
    );
    if (recoveryRows.length === 0) {
      await db
        .update(creditOrder)
        .set({ recoveryMode: "exact" })
        .where(eq(creditOrder.id, order.id));
      exact += 1;
      continue;
    }
    const [purchase] = await db
      .select()
      .from(creditTransaction)
      .where(
        and(
          eq(creditTransaction.userId, order.userId),
          eq(creditTransaction.sourceProvider, order.provider),
          eq(creditTransaction.sourceType, "purchase"),
          eq(creditTransaction.sourceId, order.providerPaymentId),
        ),
      )
      .limit(1);
    const hasAnyUsage = await db
      .select({ id: creditTransaction.id })
      .from(creditTransaction)
      .where(
        and(eq(creditTransaction.userId, order.userId), eq(creditTransaction.sourceType, "usage")),
      )
      .limit(1);
    const row = recoveryRows.length === 1 ? recoveryRows[0] : null;
    const recoveryType = row?.sourceType === "refund" ? "refund" : "chargeback";
    const metadata = row ? asRecoveryMetadata(row.metadata) : {};
    const amountCents =
      row?.sourceType === "refund" ? metadata.amountRefunded : metadata.disputedAmountCents;
    const creditAmount = row ? -row.amount : 0;
    const canRebuild =
      Boolean(row) &&
      Boolean(purchase) &&
      hasAnyUsage.length === 0 &&
      Number.isInteger(amountCents) &&
      amountCents! > 0 &&
      amountCents! <= order.amountCents &&
      creditAmount === Math.ceil((order.creditAmount * amountCents!) / order.amountCents) &&
      purchase!.remainingAmount === order.creditAmount - creditAmount;
    if (!canRebuild || !row || !purchase || amountCents === undefined) {
      await db
        .update(creditOrder)
        .set({ recoveryMode: "legacy_review" })
        .where(eq(creditOrder.id, order.id));
      legacyReview += 1;
      continue;
    }
    const now = new Date();
    await db
      .insert(creditPurchaseRecoveryEvent)
      .values({
        id: crypto.randomUUID(),
        creditOrderId: order.id,
        userId: order.userId,
        provider: order.provider,
        recoveryType,
        providerRecoveryId: row.sourceId,
        providerPaymentId: order.providerPaymentId,
        state: "active",
        amountCents,
        currency: order.currency.toLowerCase(),
        providerEventAt: row.createdAt,
        providerEventId: row.sourceId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    await db
      .update(creditOrder)
      .set({
        recoveryMode: "exact",
        recoveredAmountCents: amountCents,
        recoveredCreditAmount: creditAmount,
        recoveredSpendableAmount: creditAmount,
        recoveryVersion: Math.max(1, order.recoveryVersion),
      })
      .where(eq(creditOrder.id, order.id));
    exact += 1;
  }
  return { exact, legacyReview };
}
