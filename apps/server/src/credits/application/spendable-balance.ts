import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { creditTransaction } from "@/db/schema/credits";

function spendableWhere(userId: string, now: Date) {
  return and(
    eq(creditTransaction.userId, userId),
    gt(creditTransaction.remainingAmount, 0),
    or(isNull(creditTransaction.expiresAt), gt(creditTransaction.expiresAt, now)),
  );
}

/** Returns lots that are spendable at this instant; expired lots never enter the result. */
export function listSpendableCreditLots(db: Database, userId: string, now: Date, limit?: number) {
  const query = db
    .select()
    .from(creditTransaction)
    .where(spendableWhere(userId, now))
    .orderBy(
      asc(isNull(creditTransaction.expiresAt)),
      asc(creditTransaction.expiresAt),
      asc(creditTransaction.createdAt),
    );
  return limit === undefined ? query : query.limit(limit);
}

/** Authoritative effective balance. The cached account balance is not used for spendability. */
export async function getSpendableBalance(db: Database, userId: string, now = new Date()) {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditTransaction.remainingAmount}), 0)` })
    .from(creditTransaction)
    .where(spendableWhere(userId, now));
  return row?.balance ?? 0;
}
