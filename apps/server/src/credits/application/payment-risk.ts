import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { ServerPaymentProviderKey } from "@repo/app-config";
import type { Database } from "@/db";
import {
  creditAccount,
  creditOrder,
  creditPaymentDispute,
  type CreditPaymentDisputeStatus,
} from "@/db/schema/credits";
import { ensureCreditAccount } from "./internal";
import { revokeCreditPurchaseBySource } from "./consume";
import { markCreditOrderRefunded } from "./orders";

type CreditPaymentDisputeInput = {
  provider: ServerPaymentProviderKey;
  providerDisputeId: string;
  providerPaymentId?: string | null;
  userId?: string | null;
  status: CreditPaymentDisputeStatus;
  amountCents?: number | null;
  currency?: string | null;
  providerEventAt: Date;
  providerEventId: string;
};

/**
 * Persists provider dispute state, blocks the affected account, and turns a lost
 * credit chargeback into a ledger debt. There is no automatic unhold for a loss.
 */
export async function recordCreditPaymentDispute(db: Database, input: CreditPaymentDisputeInput) {
  const [order] = input.providerPaymentId
    ? await db
        .select()
        .from(creditOrder)
        .where(
          and(
            eq(creditOrder.provider, input.provider),
            eq(creditOrder.providerPaymentId, input.providerPaymentId),
          ),
        )
        .limit(1)
    : [];
  const userId = order?.userId ?? input.userId ?? null;
  if (!userId) return null;
  if (input.userId && order && input.userId !== order.userId) {
    throw new Error("Payment dispute user does not match the credit order");
  }

  await ensureCreditAccount(db, userId);
  const now = new Date();
  await db
    .insert(creditPaymentDispute)
    .values({
      id: crypto.randomUUID(),
      userId,
      provider: input.provider,
      providerDisputeId: input.providerDisputeId,
      providerPaymentId: input.providerPaymentId ?? null,
      status: input.status,
      amountCents: input.amountCents ?? null,
      currency: input.currency?.toLowerCase() ?? null,
      providerEventAt: input.providerEventAt,
      providerEventId: input.providerEventId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [creditPaymentDispute.provider, creditPaymentDispute.providerDisputeId],
      set: {
        providerPaymentId: input.providerPaymentId ?? null,
        status: input.status,
        amountCents: input.amountCents ?? null,
        currency: input.currency?.toLowerCase() ?? null,
        providerEventAt: input.providerEventAt,
        providerEventId: input.providerEventId,
        updatedAt: now,
      },
      where: or(
        isNull(creditPaymentDispute.providerEventAt),
        lt(creditPaymentDispute.providerEventAt, input.providerEventAt),
        and(
          eq(creditPaymentDispute.providerEventAt, input.providerEventAt),
          sql`COALESCE(${creditPaymentDispute.providerEventId}, '') < ${input.providerEventId}`,
        ),
      ),
    });

  const [dispute] = await db
    .select()
    .from(creditPaymentDispute)
    .where(
      and(
        eq(creditPaymentDispute.provider, input.provider),
        eq(creditPaymentDispute.providerDisputeId, input.providerDisputeId),
      ),
    )
    .limit(1);
  if (!dispute) throw new Error("Payment dispute could not be recorded");

  await db
    .update(creditAccount)
    .set({
      billingHold: sql`EXISTS(
        SELECT 1 FROM credit_payment_dispute
        WHERE user_id = ${userId} AND status IN ('open', 'lost')
      )`,
      updatedAt: now,
    })
    .where(eq(creditAccount.userId, userId));

  if (dispute.status !== "lost" || !order) return dispute;
  if (
    input.amountCents === null ||
    input.amountCents === undefined ||
    input.amountCents <= 0 ||
    !input.currency ||
    input.currency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    throw new Error("Lost credit dispute is missing a matching payment amount and currency");
  }

  const disputedAmountCents = Math.min(input.amountCents, order.amountCents);
  const creditDebt = Math.ceil((order.creditAmount * disputedAmountCents) / order.amountCents);
  await revokeCreditPurchaseBySource(db, {
    originalSourceProvider: input.provider,
    originalSourceId: order.providerPaymentId ?? input.providerPaymentId!,
    refundSourceId: dispute.providerDisputeId,
    recoverySourceType: "chargeback",
    amount: creditDebt,
    metadata: {
      disputeId: dispute.providerDisputeId,
      disputedAmountCents,
      providerEventId: dispute.providerEventId ?? "",
    },
  });
  if (disputedAmountCents === order.amountCents) {
    await markCreditOrderRefunded(db, {
      sourceProvider: input.provider,
      providerPaymentId: order.providerPaymentId ?? input.providerPaymentId!,
    });
  }

  return dispute;
}
