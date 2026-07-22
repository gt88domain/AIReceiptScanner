import { and, asc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { creditTransaction } from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  assertPositiveAmount,
  createAccountDebitUpdate,
  createBatchChangeGuard,
  ensureCreditAccount,
  findTransactionBySource,
  runCreditBatch,
  type CreditBatchItem,
} from "./internal";
import { getBalance } from "./read";
import { ensureSignupGrant } from "./signup-grant";
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
    sourceType: "refund",
    sourceId: input.refundSourceId,
  } satisfies CreditSource;

  for (let attempt = 0; attempt < 2; attempt++) {
    const existingRefund = await findTransactionBySource(db, refundSource);
    const purchase = await findTransactionBySource(db, {
      sourceProvider: input.originalSourceProvider,
      sourceType: "purchase",
      sourceId: input.originalSourceId,
    });
    if (!purchase || purchase.userId !== input.user.userId) {
      return existingRefund ?? null;
    }

    if (existingRefund) {
      const remainingRefundAmount = Math.min(
        purchase.remainingAmount,
        Math.abs(existingRefund.amount),
      );
      if (remainingRefundAmount > 0) {
        await runCreditBatch(db, [
          db
            .update(creditTransaction)
            .set({
              remainingAmount: sql`${creditTransaction.remainingAmount} - ${remainingRefundAmount}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(creditTransaction.id, purchase.id),
                gte(creditTransaction.remainingAmount, remainingRefundAmount),
              ),
            ),
          createBatchChangeGuard(db, refundSource),
          createAccountDebitUpdate(db, {
            userId: input.user.userId,
            amount: remainingRefundAmount,
            field: "totalRevoked",
            now: new Date(),
            requireAvailableBalance: true,
          }),
          createBatchChangeGuard(db, refundSource),
        ]);
      }
      return existingRefund;
    }

    if (purchase.remainingAmount <= 0) {
      return null;
    }

    const now = new Date();
    const amountToRevoke = purchase.remainingAmount;
    try {
      await runCreditBatch(db, [
        db.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: input.user.userId,
          amount: -amountToRevoke,
          remainingAmount: 0,
          sourceProvider: input.originalSourceProvider,
          sourceType: "refund",
          sourceId: input.refundSourceId,
          packageId: purchase.packageId,
          expiresAt: null,
          metadata: input.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        }),
        db
          .update(creditTransaction)
          .set({
            remainingAmount: sql`${creditTransaction.remainingAmount} - ${amountToRevoke}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(creditTransaction.id, purchase.id),
              gte(creditTransaction.remainingAmount, amountToRevoke),
            ),
          ),
        createBatchChangeGuard(db, refundSource),
        createAccountDebitUpdate(db, {
          userId: input.user.userId,
          amount: amountToRevoke,
          field: "totalRevoked",
          now,
          requireAvailableBalance: true,
        }),
        createBatchChangeGuard(db, refundSource),
      ]);
    } catch (error) {
      const existing = await findTransactionBySource(db, refundSource);
      if (existing) {
        return existing;
      }
      if (attempt === 0) {
        continue;
      }
      throw error;
    }

    return findTransactionBySource(db, refundSource);
  }

  return null;
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
    const grantRows = await db
      .select()
      .from(creditTransaction)
      .where(
        and(
          eq(creditTransaction.userId, input.user.userId),
          gt(creditTransaction.remainingAmount, 0),
          or(isNull(creditTransaction.expiresAt), gt(creditTransaction.expiresAt, now)),
        ),
      )
      .orderBy(asc(creditTransaction.createdAt));
    const grants = grantRows.sort((a, b) => {
      const aExpiry = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bExpiry = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return aExpiry - bExpiry || a.createdAt.getTime() - b.createdAt.getTime();
    });
    const available = grants.reduce((sum, item) => sum + item.remainingAmount, 0);
    if (available < input.amount) {
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
