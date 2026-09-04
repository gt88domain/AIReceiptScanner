import type { Database } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema/auth";
import type { StorageData, StorageProvider } from "@/storage";
import {
  getUserStoragePrefix,
  parseStoragePublicUrl,
} from "@/storage";
import {
  createAsset as createAssetRecord,
  createAssetIfAbsent,
  deleteAssetRecord,
  findAssetById,
  findAssetByStorageKey,
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

/**
 * Adopts only the avatar URL persisted on this user record. The database user
 * relation, not a key prefix, is the ownership proof for this legacy backfill.
 */
export async function backfillCurrentAvatarAsset(
  db: Database,
  storage: StorageProvider,
  input: { ownerId: string; publicBaseUrl: string },
) {
  const [owner] = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, input.ownerId))
    .limit(1);
  if (!owner?.image) return null;

  const parsed = parseStoragePublicUrl(input.publicBaseUrl, owner.image);
  if (!parsed || !parsed.key.startsWith(getUserStoragePrefix("avatar", input.ownerId))) return null;

  const existing = await findAssetByStorageKey(db, parsed.key);
  if (existing) return existing.ownerId === input.ownerId ? existing : null;

  const object = await storage.head(parsed.key);
  if (!object) return null;
  const record = await createAssetIfAbsent(db, {
    ownerId: input.ownerId,
    visibility: "public",
    storageKey: object.key,
    mimeType: object.httpMetadata?.contentType ?? "application/octet-stream",
    size: object.size,
    createdAt: object.uploaded,
  });
  return record?.ownerId === input.ownerId ? record : null;
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
