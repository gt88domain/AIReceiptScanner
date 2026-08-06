import { and, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder, creditTransaction } from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  assertPositiveAmount,
  CREDIT_CONSUMPTION_GRANT_LIMIT,
  createAccountDebitUpdate,
  createBatchChangeGuard,
  findTransactionBySource,
  runCreditBatch,
  type CreditBatchItem,
} from "./internal";
import { applyCreditPurchaseRecovery } from "./purchase-recovery";
import { getBalance } from "./read";
import { ensureSignupGrant } from "./signup-grant";
import { listSpendableCreditLots } from "./spendable-balance";
import type {
  ConsumeCreditsInput,
  CreditServiceContext,
  CreditSource,
  RevokeCreditPurchaseBySourceInput,
  RevokeCreditPurchaseInput,
} from "./types";

export async function revokeCreditPurchase(db: Database, input: RevokeCreditPurchaseInput) {
  if (input.amount !== undefined) throw new Error("CREDIT_RECOVERY_LEGACY_REVIEW_REQUIRED");
  const [order] = await db
    .select()
    .from(creditOrder)
    .where(
      and(
        eq(creditOrder.provider, input.originalSourceProvider),
        eq(creditOrder.providerPaymentId, input.originalSourceId),
      ),
    )
    .limit(1);
  if (!order || order.userId !== input.user.userId) return null;
  return applyCreditPurchaseRecovery(db, {
    provider: input.originalSourceProvider,
    providerPaymentId: input.originalSourceId,
    recoveryType: input.recoverySourceType ?? "refund",
    providerRecoveryId: input.refundSourceId,
    state: "active",
    amountCents: order.amountCents,
    currency: order.currency,
  });
}

export async function revokeCreditPurchaseBySource(
  db: Database,
  input: RevokeCreditPurchaseBySourceInput,
) {
  const purchase = await findTransactionBySource(db, {
    sourceProvider: input.originalSourceProvider,
    sourceType: "purchase",
    sourceId: input.originalSourceId,
  });

  if (!purchase) {
    return null;
  }

  return revokeCreditPurchase(db, {
    user: { userId: purchase.userId },
    originalSourceProvider: input.originalSourceProvider,
    originalSourceId: input.originalSourceId,
    refundSourceId: input.refundSourceId,
    recoverySourceType: input.recoverySourceType,
    amount: input.amount,
    metadata: input.metadata ?? null,
  });
}

export async function consumeCredits(
  db: Database,
  input: ConsumeCreditsInput,
  serviceContext: CreditServiceContext = {},
) {
  assertCreditsEnabled();
  assertPositiveAmount(input.amount);
  await ensureSignupGrant(db, input.user, serviceContext);

  const usageSource = {
    sourceProvider: "app",
    sourceType: "usage",
    sourceId: input.sourceId,
  } satisfies CreditSource;

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await findTransactionBySource(db, usageSource);
    if (existing) {
      if (existing.userId !== input.user.userId || existing.amount !== -input.amount) {
        throw new Error("Credit usage source does not match this operation");
      }
      return { balance: await getBalance(db, input.user, serviceContext), consumed: false };
    }

    const now = new Date();
    const grantRows = await listSpendableCreditLots(
      db,
      input.user.userId,
      now,
      CREDIT_CONSUMPTION_GRANT_LIMIT,
    );
    const grants = grantRows;
    const available = grants.reduce((sum, item) => sum + item.remainingAmount, 0);
    if (available < input.amount) {
      if (grants.length === CREDIT_CONSUMPTION_GRANT_LIMIT) {
        throw new Error("Credit balance is too fragmented to consume safely");
      }
      throw new Error("Insufficient credits");
    }

    let remainingToConsume = input.amount;
    const batch: CreditBatchItem[] = [
      db.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: input.user.userId,
        amount: -input.amount,
        remainingAmount: 0,
        sourceProvider: "app",
        sourceType: "usage",
        sourceId: input.sourceId,
        packageId: null,
        expiresAt: null,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      }),
      createAccountDebitUpdate(db, {
        userId: input.user.userId,
        amount: input.amount,
        field: "totalConsumed",
        now,
        requireAvailableBalance: true,
      }),
      createBatchChangeGuard(db, usageSource),
    ];

    for (const grant of grants) {
      if (remainingToConsume <= 0) {
        break;
      }

      const consumedFromGrant = Math.min(grant.remainingAmount, remainingToConsume);
      remainingToConsume -= consumedFromGrant;
      batch.push(
        db
          .update(creditTransaction)
          .set({
            remainingAmount: sql`${creditTransaction.remainingAmount} - ${consumedFromGrant}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(creditTransaction.id, grant.id),
              eq(creditTransaction.userId, input.user.userId),
              gte(creditTransaction.remainingAmount, consumedFromGrant),
              or(isNull(creditTransaction.expiresAt), gt(creditTransaction.expiresAt, now)),
            ),
          ),
        createBatchChangeGuard(db, usageSource),
      );
    }

    try {
      await runCreditBatch(db, batch);
      return { balance: await getBalance(db, input.user, serviceContext), consumed: true };
    } catch (error) {
      const existing = await findTransactionBySource(db, usageSource);
      if (existing) {
        if (existing.userId !== input.user.userId || existing.amount !== -input.amount) {
          throw new Error("Credit usage source does not match this operation");
        }
        return { balance: await getBalance(db, input.user, serviceContext), consumed: false };
      }
      if (attempt === 0) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Insufficient credits");
}
