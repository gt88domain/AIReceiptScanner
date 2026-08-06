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
import { applyCreditPurchaseRecovery } from "./purchase-recovery";

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
 * Persists provider dispute state and delegates lost/won ledger changes to the
 * aggregate purchase-recovery engine.
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

  if ((dispute.status !== "lost" && dispute.status !== "won") || !order) return dispute;
  if (
    dispute.amountCents === null ||
    dispute.amountCents <= 0 ||
    !dispute.currency ||
    dispute.currency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    throw new Error("Credit dispute is missing a matching payment amount and currency");
  }

  await applyCreditPurchaseRecovery(db, {
    provider: input.provider,
    providerPaymentId: order.providerPaymentId ?? input.providerPaymentId!,
    recoveryType: "chargeback",
    providerRecoveryId: dispute.providerDisputeId,
    state: dispute.status === "lost" ? "active" : "inactive",
    amountCents: Math.min(dispute.amountCents, order.amountCents),
    currency: dispute.currency,
    providerEventAt: dispute.providerEventAt,
    providerEventId: dispute.providerEventId,
  });

  return dispute;
}
