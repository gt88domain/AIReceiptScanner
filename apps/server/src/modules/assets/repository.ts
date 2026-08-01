import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { asset, type Asset } from "@/db/schema/assets";

export type CreateAssetInput = Pick<
  Asset,
  "ownerId" | "visibility" | "storageKey" | "mimeType" | "size"
>;

export async function createAsset(db: Database, input: CreateAssetInput) {
  const now = new Date();
  const record: Asset = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(asset).values(record);
  return record;
}

export async function findAssetById(db: Database, id: string) {
  const [record] = await db.select().from(asset).where(eq(asset.id, id)).limit(1);
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
