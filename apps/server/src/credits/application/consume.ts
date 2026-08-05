import { and, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { creditTransaction } from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  assertPositiveAmount,
  CREDIT_CONSUMPTION_GRANT_LIMIT,
  createAccountDebitUpdate,
  createBatchChangeGuard,
  ensureCreditAccount,
  findTransactionBySource,
  runCreditBatch,
  type CreditBatchItem,
} from "./internal";
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
  assertCreditsEnabled();
  await ensureCreditAccount(db, input.user.userId);

  const refundSource = {
    sourceProvider: input.originalSourceProvider,
    sourceType: input.recoverySourceType ?? "refund",
    sourceId: input.refundSourceId,
  } satisfies CreditSource;

  const existingRefund = await findTransactionBySource(db, refundSource);
  if (existingRefund) return existingRefund;

  const purchase = await findTransactionBySource(db, {
    sourceProvider: input.originalSourceProvider,
    sourceType: "purchase",
    sourceId: input.originalSourceId,
  });
  if (!purchase || purchase.userId !== input.user.userId) return null;

  const amountToRevoke = Math.min(input.amount ?? purchase.amount, purchase.amount);
  assertPositiveAmount(amountToRevoke);
  const now = new Date();
  try {
    await runCreditBatch(db, [
      db.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: input.user.userId,
        amount: -amountToRevoke,
        remainingAmount: 0,
        sourceProvider: input.originalSourceProvider,
        sourceType: refundSource.sourceType,
        sourceId: input.refundSourceId,
        packageId: purchase.packageId,
        expiresAt: null,
        metadata: {
          ...input.metadata,
          originalSourceId: input.originalSourceId,
        },
        createdAt: now,
        updatedAt: now,
      }),
      db
        .update(creditTransaction)
        .set({
          remainingAmount: sql`CASE WHEN ${creditTransaction.remainingAmount} > ${amountToRevoke}
            THEN ${creditTransaction.remainingAmount} - ${amountToRevoke} ELSE 0 END`,
          updatedAt: now,
        })
        .where(eq(creditTransaction.id, purchase.id)),
      createAccountDebitUpdate(db, {
        userId: input.user.userId,
        amount: amountToRevoke,
        field: "totalRevoked",
        now,
      }),
    ]);
  } catch (error) {
    const existing = await findTransactionBySource(db, refundSource);
    if (existing) return existing;
    throw error;
  }

  return findTransactionBySource(db, refundSource);
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
