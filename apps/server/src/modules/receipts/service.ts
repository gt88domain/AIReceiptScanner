import type { Database } from "@/db";
import type { Receipt } from "@/db/schema/receipts";
import {
  createReceiptIfAbsent,
  deleteOwnedReceipt,
  findOwnedReceipt,
  listOwnedReceipts,
  updateOwnedReceipt,
  type CreateReceiptRecordInput,
  type UpdateReceiptRecordInput,
} from "./repository";

export class ReceiptVersionConflictError extends Error {
  constructor() {
    super("Receipt was updated by another request");
    this.name = "ReceiptVersionConflictError";
  }
}

export class ReceiptIdempotencyConflictError extends Error {
  constructor() {
    super("Receipt capture id was already used with different data");
    this.name = "ReceiptIdempotencyConflictError";
  }
}

const IDEMPOTENT_CREATE_FIELDS = [
  "merchantName",
  "purchaseDate",
  "purchaseTime",
  "currency",
  "subtotalMinor",
  "taxMinor",
  "tipMinor",
  "totalMinor",
  "paymentMethod",
  "paymentLast4",
  "category",
  "verificationStatus",
  "extractionSource",
  "localQuality",
  "extractionDurationMs",
  "engineVersion",
] as const satisfies readonly (keyof Receipt)[];

function matchesCreateInput(record: Receipt, input: CreateReceiptRecordInput) {
  return IDEMPOTENT_CREATE_FIELDS.every((key) => record[key] === input[key]);
}

export async function createReceipt(
  db: Database,
  input: CreateReceiptRecordInput,
) {
  const result = await createReceiptIfAbsent(db, input);
  if (!result) throw new Error("Receipt persistence failed");
  if (!result.created && !matchesCreateInput(result.record, input)) {
    throw new ReceiptIdempotencyConflictError();
  }
  return result.record;
}

export function getReceipt(db: Database, ownerId: string, id: string) {
  return findOwnedReceipt(db, ownerId, id);
}

export async function listReceipts(
  db: Database,
  input: { ownerId: string; page: number; perPage: number },
) {
  const { records, total } = await listOwnedReceipts(db, {
    ownerId: input.ownerId,
    limit: input.perPage,
    offset: (input.page - 1) * input.perPage,
  });
  return {
    data: records,
    total,
    page: input.page,
    pageCount: Math.ceil(total / input.perPage),
  };
}

export async function updateReceipt(
  db: Database,
  input: {
    ownerId: string;
    id: string;
    expectedVersion: number;
    changes: UpdateReceiptRecordInput;
  },
) {
  const updated = await updateOwnedReceipt(db, input);
  if (updated) return updated;

  const existing = await findOwnedReceipt(db, input.ownerId, input.id);
  if (existing) throw new ReceiptVersionConflictError();
  return null;
}

export function deleteReceipt(db: Database, ownerId: string, id: string) {
  return deleteOwnedReceipt(db, ownerId, id);
}
