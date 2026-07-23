import {
  creditsConfig,
  normalizeCreditsConfig,
  type NormalizedCreditPackage,
} from "@repo/app-config/credits";
import { and, count, desc, eq, gt, lte } from "drizzle-orm";
import type { Database } from "@/db";
import { creditAccount, creditOrder, creditTransaction } from "@/db/schema/credits";
import { toPublicCreditOrder } from "./orders";
import { EXPIRING_WINDOW_DAYS, addDays, assertCreditsEnabled } from "./internal";
import { ensureSignupGrant } from "./signup-grant";
import type {
  CreditServiceContext,
  CreditUser,
  ListCreditOrdersInput,
  ListPackagesInput,
  ListTransactionsInput,
} from "./types";
import type {
  CreditBalance,
  CreditPackage,
  ListCreditOrdersOutput,
  ListCreditTransactionsOutput,
} from "../public/schemas";

function toPublicPackage(
  creditPackage: NormalizedCreditPackage,
  platform: ListPackagesInput["platform"],
): CreditPackage | null {
  if (creditPackage.status !== "active") {
    return null;
  }

  if (platform === "web") {
    if (!creditPackage.web || creditPackage.web.status !== "active") {
      return null;
    }

    return {
      id: creditPackage.id,
      amount: creditPackage.amount,
      platform,
      provider: creditPackage.web.provider,
      providerProductId: null,
      currency: creditPackage.web.currency,
      amountCents: creditPackage.web.amountCents,
    };
  }

  const product = creditPackage.native[platform];
  if (!product || product.status !== "active") {
    return null;
  }

  return {
    id: creditPackage.id,
    amount: creditPackage.amount,
    platform,
    provider: product.provider,
    providerProductId: product.providerProductId,
    currency: product.currency,
    amountCents: product.amountCents,
  };
}

export function listPackages(input: ListPackagesInput): CreditPackage[] {
  const config = normalizeCreditsConfig(creditsConfig);
  if (!config.enabled) {
    return [];
  }

  return config.packages
    .map((creditPackage) => toPublicPackage(creditPackage, input.platform))
    .filter((item): item is CreditPackage => item !== null);
}

export async function getBalance(
  db: Database,
  input: CreditUser,
  serviceContext: CreditServiceContext = {},
): Promise<CreditBalance> {
  assertCreditsEnabled();
  await ensureSignupGrant(db, input, serviceContext);

  const [account] = await db
    .select()
    .from(creditAccount)
    .where(eq(creditAccount.userId, input.userId))
    .limit(1);

  const now = new Date();
  const expiringBefore = addDays(now, EXPIRING_WINDOW_DAYS);
  const expiringRows = await db
    .select({ remainingAmount: creditTransaction.remainingAmount })
    .from(creditTransaction)
    .where(
      and(
        eq(creditTransaction.userId, input.userId),
        gt(creditTransaction.remainingAmount, 0),
        gt(creditTransaction.expiresAt, now),
        lte(creditTransaction.expiresAt, expiringBefore),
      ),
    );
  const expiringCredits = expiringRows.reduce((sum, row) => sum + row.remainingAmount, 0);

  return {
    userId: input.userId,
    balance: account?.balance ?? 0,
    totalGranted: account?.totalGranted ?? 0,
    totalConsumed: account?.totalConsumed ?? 0,
    totalExpired: account?.totalExpired ?? 0,
    totalRevoked: account?.totalRevoked ?? 0,
    expiringCredits,
  };
}

export async function listTransactions(
  db: Database,
  input: ListTransactionsInput,
  serviceContext: CreditServiceContext = {},
): Promise<ListCreditTransactionsOutput> {
  assertCreditsEnabled();
  await ensureSignupGrant(db, input.user, serviceContext);

  const offset = (input.page - 1) * input.perPage;
  const filter = input.sourceType
    ? and(
        eq(creditTransaction.userId, input.user.userId),
        eq(creditTransaction.sourceType, input.sourceType),
      )
    : eq(creditTransaction.userId, input.user.userId);
  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(creditTransaction)
      .where(filter)
      .orderBy(desc(creditTransaction.createdAt))
      .limit(input.perPage)
      .offset(offset),
    db.select({ count: count() }).from(creditTransaction).where(filter),
  ]);
  const total = totalRows.at(0)?.count ?? 0;

  return {
    data: items.map((item) => ({
      id: item.id,
      amount: item.amount,
      remainingAmount: item.remainingAmount,
      sourceProvider: item.sourceProvider,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      packageId: item.packageId,
      expiresAt: item.expiresAt,
      metadata: item.metadata ?? null,
      createdAt: item.createdAt,
    })),
    pageCount: Math.ceil(total / input.perPage),
    total,
  };
}

export async function listCreditOrders(
  db: Database,
  input: ListCreditOrdersInput,
): Promise<ListCreditOrdersOutput> {
  assertCreditsEnabled();

  const offset = (input.page - 1) * input.perPage;
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(creditOrder)
      .where(eq(creditOrder.userId, input.user.userId))
      .orderBy(desc(creditOrder.createdAt))
      .limit(input.perPage)
      .offset(offset),
    db
      .select({ count: count() })
      .from(creditOrder)
      .where(eq(creditOrder.userId, input.user.userId)),
  ]);
  const total = totalRows.at(0)?.count ?? 0;

  return {
    data: rows.map(toPublicCreditOrder),
    pageCount: Math.ceil(total / input.perPage),
    total,
  };
}
