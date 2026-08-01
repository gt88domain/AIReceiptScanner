import type { Database } from "@/db";
import type { StorageData, StorageProvider } from "@/storage";
import {
  createAsset as createAssetRecord,
  deleteAssetRecord,
  findAssetById,
  findOwnedAsset,
} from "./repository";

type CreateStoredAssetInput = {
  ownerId: string;
  visibility: "private" | "public";
  storageKey: string;
  mimeType: string;
  data: StorageData;
};

/** Resolves assets without leaking private metadata to a non-owner. */
export async function getReadableAsset(
  db: Database,
  input: { assetId: string; viewerId?: string },
) {
  if (input.viewerId) {
    const ownedAsset = await findOwnedAsset(db, input.assetId, input.viewerId);
    if (ownedAsset) return ownedAsset;
  }

  const record = await findAssetById(db, input.assetId);
  return record?.visibility === "public" ? record : null;
}

/** Authorizes a viewer before any product reads storage data or returns its metadata. */
export function authorizeAsset(db: Database, input: { assetId: string; viewerId?: string }) {
  return getReadableAsset(db, input);
}

/** Writes storage first, then persists the asset record; cleans up an orphaned object on DB failure. */
export async function createAsset(
  db: Database,
  storage: StorageProvider,
  input: CreateStoredAssetInput,
) {
  const object = await storage.put(input.storageKey, input.data, { contentType: input.mimeType });
  try {
    return await createAssetRecord(db, {
      ownerId: input.ownerId,
      visibility: input.visibility,
      storageKey: object.key,
      mimeType: input.mimeType,
      size: object.size,
    });
  } catch (error) {
    try {
      await storage.delete(object.key);
    } catch (cleanupError) {
      console.error("Failed to clean up an asset object after metadata persistence failed", {
        storageKey: object.key,
        error: cleanupError,
      });
    }
    throw error;
  }
}

/** Returns a storage object only after ownership/public-visibility authorization. */
export async function getAsset(
  db: Database,
  storage: StorageProvider,
  input: { assetId: string; viewerId?: string },
) {
  const record = await authorizeAsset(db, input);
  if (!record) return null;
  const object = await storage.get(record.storageKey);
  return object ? { asset: record, object } : null;
}

/** Deletes an owner's R2 object before removing its metadata record. */
export async function deleteAsset(
  db: Database,
  storage: StorageProvider,
  input: { assetId: string; ownerId: string },
) {
  const record = await findOwnedAsset(db, input.assetId, input.ownerId);
  if (!record) return false;
  // ponytail: R2 and D1 have no shared transaction; retrying this operation is safe.
  await storage.delete(record.storageKey);
  await deleteAssetRecord(db, record.id);
  return true;
}
