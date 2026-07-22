import { creditsConfig, normalizeCreditsConfig } from "@repo/app-config/credits";
import { and, eq, gte, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@/db";
import { creditAccount, creditTransaction } from "@/db/schema/credits";
import type { CreditSource } from "./types";

export const EXPIRING_WINDOW_DAYS = 7;
export const PENDING_ORDER_EXPIRATION_HOURS = 24;
export type CreditBatchItem = BatchItem<"sqlite">;

export function getConfig() {
  return normalizeCreditsConfig(creditsConfig);
}

export function assertCreditsEnabled() {
  if (!getConfig().enabled) {
    throw new Error("Credits are disabled");
  }
}

export function assertPositiveAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Credit amount must be a positive integer");
  }
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function createEmptyAccountInsert(db: Database, userId: string, now: Date) {
  return db
    .insert(creditAccount)
    .values({
      userId,
      balance: 0,
      totalGranted: 0,
      totalConsumed: 0,
      totalExpired: 0,
      totalRevoked: 0,
      billingHold: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function ensureCreditAccount(db: Database, userId: string) {
  await createEmptyAccountInsert(db, userId, new Date());
}

export async function assertCreditAccountNotOnBillingHold(db: Database, userId: string) {
  await ensureCreditAccount(db, userId);
  const [account] = await db
    .select({ billingHold: creditAccount.billingHold })
    .from(creditAccount)
    .where(eq(creditAccount.userId, userId))
    .limit(1);
  if (account?.billingHold) {
    throw new Error("Credit account is on billing hold");
  }
}

export async function findTransactionBySource(db: Database, source: CreditSource) {
  const [existing] = await db
    .select()
    .from(creditTransaction)
    .where(
      and(
        eq(creditTransaction.sourceProvider, source.sourceProvider),
        eq(creditTransaction.sourceType, source.sourceType),
        eq(creditTransaction.sourceId, source.sourceId),
      ),
    )
    .limit(1);

  return existing ?? null;
}

export function createAccountGrantUpdate(db: Database, userId: string, amount: number, now: Date) {
  return db
    .insert(creditAccount)
    .values({
      userId,
      balance: amount,
      totalGranted: amount,
      totalConsumed: 0,
      totalExpired: 0,
      totalRevoked: 0,
      billingHold: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: creditAccount.userId,
      set: {
        balance: sql`${creditAccount.balance} + ${amount}`,
        totalGranted: sql`${creditAccount.totalGranted} + ${amount}`,
        updatedAt: now,
      },
    });
}

export function createAccountDebitUpdate(
  db: Database,
  input: {
    userId: string;
    amount: number;
    field: "totalConsumed" | "totalExpired" | "totalRevoked";
    now: Date;
    requireAvailableBalance?: boolean;
  },
) {
  return db
    .update(creditAccount)
    .set({
      balance: sql`${creditAccount.balance} - ${input.amount}`,
      [input.field]: sql`${creditAccount[input.field]} + ${input.amount}`,
      updatedAt: input.now,
    })
    .where(
      input.requireAvailableBalance
        ? and(eq(creditAccount.userId, input.userId), gte(creditAccount.balance, input.amount))
        : eq(creditAccount.userId, input.userId),
    );
}

export function createBatchChangeGuard(db: Database, source: CreditSource) {
  return db.insert(creditTransaction).select((qb) =>
    qb
      .select({
        id: creditTransaction.id,
        userId: creditTransaction.userId,
        amount: creditTransaction.amount,
        remainingAmount: creditTransaction.remainingAmount,
        sourceProvider: creditTransaction.sourceProvider,
        sourceType: creditTransaction.sourceType,
        sourceId: creditTransaction.sourceId,
        packageId: creditTransaction.packageId,
        expiresAt: creditTransaction.expiresAt,
        metadata: creditTransaction.metadata,
        createdAt: creditTransaction.createdAt,
        updatedAt: creditTransaction.updatedAt,
      })
      .from(creditTransaction)
      .where(
        and(
          eq(creditTransaction.sourceProvider, source.sourceProvider),
          eq(creditTransaction.sourceType, source.sourceType),
          eq(creditTransaction.sourceId, source.sourceId),
          sql`changes() <> 1`,
        ),
      ),
  );
}

export async function runCreditBatch(db: Database, batch: CreditBatchItem[]) {
  await db.batch(batch as [CreditBatchItem, ...CreditBatchItem[]]);
}
