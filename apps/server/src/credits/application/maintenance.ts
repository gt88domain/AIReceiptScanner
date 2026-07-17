import { and, eq, gt, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder, creditTransaction } from "@/db/schema/credits";
import {
  PENDING_ORDER_EXPIRATION_HOURS,
  assertCreditsEnabled,
  createAccountDebitUpdate,
  createBatchChangeGuard,
  findTransactionBySource,
  getConfig,
  runCreditBatch,
  type CreditBatchItem,
} from "./internal";
import type { CreditSource } from "./types";

export async function expireCredits(db: Database, now = new Date()) {
  assertCreditsEnabled();
  const expiredGrants = await db
    .select()
    .from(creditTransaction)
    .where(and(gt(creditTransaction.remainingAmount, 0), lte(creditTransaction.expiresAt, now)));

  let expiredAmount = 0;
  for (const grant of expiredGrants) {
    const expirationSource = {
      sourceProvider: "system",
      sourceType: "expiration",
      sourceId: grant.id,
    } satisfies CreditSource;

    for (let attempt = 0; attempt < 2; attempt++) {
      const [reloadedGrant] =
        attempt === 0
          ? [grant]
          : await db
              .select()
              .from(creditTransaction)
              .where(eq(creditTransaction.id, grant.id))
              .limit(1);
      const latestGrant = reloadedGrant ?? null;
      if (!latestGrant || latestGrant.remainingAmount <= 0) {
        break;
      }

      const existingExpiration = await findTransactionBySource(db, expirationSource);
      const amount = existingExpiration
        ? Math.min(latestGrant.remainingAmount, Math.abs(existingExpiration.amount))
        : latestGrant.remainingAmount;
      if (amount <= 0) {
        break;
      }

      const batch: CreditBatchItem[] = [
        ...(existingExpiration
          ? []
          : [
              db.insert(creditTransaction).values({
                id: crypto.randomUUID(),
                userId: latestGrant.userId,
                amount: -amount,
                remainingAmount: 0,
                sourceProvider: "system",
                sourceType: "expiration",
                sourceId: latestGrant.id,
                packageId: latestGrant.packageId,
                expiresAt: null,
                metadata: { expiredTransactionId: latestGrant.id },
                createdAt: now,
                updatedAt: now,
              }),
            ]),
        db
          .update(creditTransaction)
          .set({
            remainingAmount: sql`${creditTransaction.remainingAmount} - ${amount}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(creditTransaction.id, latestGrant.id),
              gte(creditTransaction.remainingAmount, amount),
            ),
          ),
        createBatchChangeGuard(db, expirationSource),
        createAccountDebitUpdate(db, {
          userId: latestGrant.userId,
          amount,
          field: "totalExpired",
          now,
          requireAvailableBalance: true,
        }),
        createBatchChangeGuard(db, expirationSource),
      ];

      try {
        await runCreditBatch(db, batch);
        expiredAmount += amount;
        break;
      } catch (error) {
        const existing = await findTransactionBySource(db, expirationSource);
        if (existing && attempt === 0) {
          continue;
        }
        throw error;
      }
    }
  }

  return { expiredTransactions: expiredGrants.length, expiredAmount };
}

async function expirePendingCreditOrders(db: Database, now = new Date()) {
  const staleBefore = new Date(now.getTime() - PENDING_ORDER_EXPIRATION_HOURS * 60 * 60 * 1000);
  const expired = await db
    .update(creditOrder)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(creditOrder.status, "pending"),
        or(
          lte(creditOrder.expiresAt, now),
          and(isNull(creditOrder.expiresAt), lte(creditOrder.updatedAt, staleBefore)),
        ),
      ),
    )
    .returning({ id: creditOrder.id });

  return { expiredOrders: expired.length };
}

export async function runCreditMaintenance(db: Database, now = new Date()) {
  if (!getConfig().enabled) {
    return {
      expiration: { expiredTransactions: 0, expiredAmount: 0 },
      orders: { expiredOrders: 0 },
    };
  }

  const expiration = await expireCredits(db, now);
  const orders = await expirePendingCreditOrders(db, now);

  return { expiration, orders };
}
