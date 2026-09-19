import { and, count, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { receipt, type Receipt } from "@/db/schema/receipts";

export type CreateReceiptRecordInput = Omit<
  Receipt,
  "id" | "version" | "createdAt" | "updatedAt"
>;

export type UpdateReceiptRecordInput = Partial<
  Pick<
    Receipt,
    | "merchantName"
    | "purchaseDate"
    | "purchaseTime"
    | "currency"
    | "subtotalMinor"
    | "taxMinor"
    | "tipMinor"
    | "totalMinor"
    | "paymentMethod"
    | "paymentLast4"
    | "category"
  >
>;

export async function findOwnedReceipt(db: Database, ownerId: string, id: string) {
  const [record] = await db
    .select()
    .from(receipt)
    .where(and(eq(receipt.id, id), eq(receipt.userId, ownerId)))
    .limit(1);
  return record ?? null;
}

export async function findOwnedReceiptByCaptureId(
  db: Database,
  ownerId: string,
  captureId: string,
) {
  const [record] = await db
    .select()
    .from(receipt)
    .where(and(eq(receipt.userId, ownerId), eq(receipt.captureId, captureId)))
    .limit(1);
  return record ?? null;
}

export async function createReceiptIfAbsent(
  db: Database,
  input: CreateReceiptRecordInput,
) {
  const now = new Date();
  const [created] = await db
    .insert(receipt)
    .values({
      id: crypto.randomUUID(),
      ...input,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [receipt.userId, receipt.captureId] })
    .returning();

  if (created) return { record: created, created: true as const };

  const existing = await findOwnedReceiptByCaptureId(db, input.userId, input.captureId);
  return existing ? { record: existing, created: false as const } : null;
}

export async function listOwnedReceipts(
  db: Database,
  input: { ownerId: string; limit: number; offset: number },
) {
  const [records, totals] = await Promise.all([
    db
      .select()
      .from(receipt)
      .where(eq(receipt.userId, input.ownerId))
      .orderBy(desc(receipt.purchaseDate), desc(receipt.createdAt), desc(receipt.id))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ count: count() }).from(receipt).where(eq(receipt.userId, input.ownerId)),
  ]);

  return { records, total: totals[0]?.count ?? 0 };
}

export async function updateOwnedReceipt(
  db: Database,
  input: {
    ownerId: string;
    id: string;
    expectedVersion: number;
    changes: UpdateReceiptRecordInput;
  },
) {
  const [record] = await db
    .update(receipt)
    .set({
      ...input.changes,
      version: input.expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(receipt.id, input.id),
        eq(receipt.userId, input.ownerId),
        eq(receipt.version, input.expectedVersion),
      ),
    )
    .returning();

  return record ?? null;
}

export async function deleteOwnedReceipt(db: Database, ownerId: string, id: string) {
  const [record] = await db
    .delete(receipt)
    .where(and(eq(receipt.id, id), eq(receipt.userId, ownerId)))
    .returning({ id: receipt.id });
  return record ?? null;
}
