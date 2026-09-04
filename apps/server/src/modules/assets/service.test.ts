import assert from "node:assert/strict";
import test from "node:test";
import type { Database } from "@/db";
import {
  getPublicUrl,
  getStoragePublicBaseUrl,
  type StorageProvider,
} from "@/storage";
import { backfillCurrentAvatarAsset, deleteAsset } from "./service";

function selectOnlyDatabase(results: readonly (readonly unknown[])[]): Database {
  let call = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => results[call++] ?? [],
        }),
      }),
    }),
  } as unknown as Database;
}

function storageWithSpies(spies: { deletes?: string[]; heads?: string[] }): StorageProvider {
  return {
    put: async () => {
      throw new Error("Unexpected put");
    },
    get: async () => null,
    head: async (key) => {
      spies.heads?.push(key);
      return null;
    },
    list: async () => [],
    delete: async (key) => {
      spies.deletes?.push(key);
    },
  };
}

test("legacy avatar adoption does not claim another user's key", async () => {
  const publicBaseUrl = getStoragePublicBaseUrl("https://server.example");
  const image = getPublicUrl(publicBaseUrl, "avatars/user-b/avatar.png", "r2");
  const heads: string[] = [];
  const result = await backfillCurrentAvatarAsset(
    selectOnlyDatabase([[{ image }]]),
    storageWithSpies({ heads }),
    { ownerId: "user-a", publicBaseUrl },
  );

  assert.equal(result, null);
  assert.deepEqual(heads, []);
});

test("legacy avatar adoption does not reassign an existing asset", async () => {
  const publicBaseUrl = getStoragePublicBaseUrl("https://server.example");
  const storageKey = "avatars/user-a/avatar.png";
  const image = getPublicUrl(publicBaseUrl, storageKey, "r2");
  const heads: string[] = [];
  const result = await backfillCurrentAvatarAsset(
    selectOnlyDatabase([
      [{ image }],
      [
        {
          id: "asset-b",
          ownerId: "user-b",
          visibility: "public",
          storageKey,
          mimeType: "image/png",
          size: 10,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        },
      ],
    ]),
    storageWithSpies({ heads }),
    { ownerId: "user-a", publicBaseUrl },
  );

  assert.equal(result, null);
  assert.deepEqual(heads, []);
});

test("asset deletion does not touch storage when ownership is absent", async () => {
  const deletes: string[] = [];
  const deleted = await deleteAsset(selectOnlyDatabase([[]]), storageWithSpies({ deletes }), {
    assetId: "asset-b",
    ownerId: "user-a",
  });

  assert.equal(deleted, false);
  assert.deepEqual(deletes, []);
});
