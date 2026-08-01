import type { Database } from "@/db";
import { findAssetById, findOwnedAsset } from "./repository";

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
