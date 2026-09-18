import { and, desc, eq, like } from "drizzle-orm";
import type { Database } from "@/db";
import { asset, type Asset } from "@/db/schema/assets";

export type CreateAssetInput = Pick<
  Asset,
  "ownerId" | "visibility" | "storageKey" | "mimeType" | "size"
> & { createdAt?: Date };

export async function createAsset(db: Database, input: CreateAssetInput) {
  const now = new Date();
  const { createdAt = now, ...values } = input;
  const record: Asset = {
    id: crypto.randomUUID(),
    ...values,
    createdAt,
    updatedAt: now,
  };
  await db.insert(asset).values(record);
  return record;
}

export async function createAssetIfAbsent(db: Database, input: CreateAssetInput) {
  const now = new Date();
  const { createdAt = now, ...values } = input;
  await db
    .insert(asset)
    .values({ id: crypto.randomUUID(), ...values, createdAt, updatedAt: now })
    .onConflictDoNothing({ target: asset.storageKey });
  return findAssetByStorageKey(db, input.storageKey);
}

export async function findAssetById(db: Database, id: string) {
  const [record] = await db.select().from(asset).where(eq(asset.id, id)).limit(1);
  return record ?? null;
}

export async function findAssetByStorageKey(db: Database, storageKey: string) {
  const [record] = await db.select().from(asset).where(eq(asset.storageKey, storageKey)).limit(1);
  return record ?? null;
}

export async function findOwnedAsset(db: Database, id: string, ownerId: string) {
  const [record] = await db
    .select()
    .from(asset)
    .where(and(eq(asset.id, id), eq(asset.ownerId, ownerId)))
    .limit(1);
  return record ?? null;
}

export async function findOwnedAssetByStorageKey(
  db: Database,
  storageKey: string,
  ownerId: string,
) {
  const [record] = await db
    .select()
    .from(asset)
    .where(and(eq(asset.storageKey, storageKey), eq(asset.ownerId, ownerId)))
    .limit(1);
  return record ?? null;
}

export function listOwnedAssets(
  db: Database,
  input: { ownerId: string; storagePrefix?: string; limit: number },
) {
  return db
    .select()
    .from(asset)
    .where(
      input.storagePrefix
        ? and(eq(asset.ownerId, input.ownerId), like(asset.storageKey, `${input.storagePrefix}%`))
        : eq(asset.ownerId, input.ownerId),
    )
    .orderBy(desc(asset.createdAt), desc(asset.id))
    .limit(input.limit);
}

export async function deleteAssetRecord(db: Database, id: string) {
  await db.delete(asset).where(eq(asset.id, id));
}
