import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder, creditTransaction } from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  assertPositiveAmount,
  createAccountGrantUpdate,
  findConfiguredCreditPackageById,
  findTransactionBySource,
  runCreditBatch,
} from "./internal";
import type {
  GrantCreditPackagePurchaseInput,
  GrantCreditsInput,
  RecordNativeCreditOrderPurchaseInput,
} from "./types";

export async function grantCredits(db: Database, input: GrantCreditsInput) {
  assertCreditsEnabled();
  assertPositiveAmount(input.amount);

  const now = new Date();
  try {
    await runCreditBatch(db, [
      db.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: input.user.userId,
        amount: input.amount,
        remainingAmount: input.amount,
        sourceProvider: input.sourceProvider,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        packageId: input.packageId ?? null,
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      }),
      createAccountGrantUpdate(db, input.user.userId, input.amount, now),
    ]);
  } catch (error) {
    const existing = await findTransactionBySource(db, input);
    if (existing) {
      return existing;
    }
    throw error;
  }

  return findTransactionBySource(db, input);
}

export async function grantCreditPackagePurchase(
  db: Database,
  input: GrantCreditPackagePurchaseInput,
) {
  const creditPackage = findConfiguredCreditPackageById(input.packageId);
  if (!creditPackage || creditPackage.status !== "active") {
    throw new Error("Credit package not available");
  }

  return grantCredits(db, {
    user: input.user,
    amount: creditPackage.amount,
    sourceProvider: input.sourceProvider,
    sourceType: "purchase",
    sourceId: input.sourceId,
    packageId: creditPackage.id,
    expiresAt: null,
    metadata: input.metadata ?? null,
  });
}

export async function recordNativeCreditOrderPurchase(
  db: Database,
  input: RecordNativeCreditOrderPurchaseInput,
) {
  const creditPackage = findConfiguredCreditPackageById(input.packageId);
  const product = creditPackage?.native[input.platform] ?? null;
  if (
    !creditPackage ||
    creditPackage.status !== "active" ||
    !product ||
    product.status !== "active"
  ) {
    throw new Error("Credit package not available");
  }
  if (product.provider !== input.sourceProvider) {
    throw new Error("Credit package provider mismatch");
  }

  const transaction = await grantCreditPackagePurchase(db, input);
  const [existing] = await db
    .select()
    .from(creditOrder)
    .where(
      and(
        eq(creditOrder.provider, input.sourceProvider),
        eq(creditOrder.providerPaymentId, input.sourceId),
      ),
    )
    .limit(1);
  if (existing) {
    return existing;
  }

  const now = new Date();
  try {
    await db.insert(creditOrder).values({
      id: crypto.randomUUID(),
      userId: input.user.userId,
      packageId: creditPackage.id,
      provider: input.sourceProvider,
      providerSessionId: input.sourceId,
      providerPaymentId: input.sourceId,
      status: "completed",
      creditAmount: creditPackage.amount,
      amountCents: product.amountCents,
      currency: product.currency,
      ledgerTransactionId: transaction?.id ?? null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    const [created] = await db
      .select()
      .from(creditOrder)
      .where(
        and(
          eq(creditOrder.provider, input.sourceProvider),
          eq(creditOrder.providerPaymentId, input.sourceId),
        ),
      )
      .limit(1);
    if (created) {
      return created;
    }
    throw error;
  }

  const [created] = await db
    .select()
    .from(creditOrder)
    .where(
      and(
        eq(creditOrder.provider, input.sourceProvider),
        eq(creditOrder.providerPaymentId, input.sourceId),
      ),
    )
    .limit(1);
  return created ?? null;
}
