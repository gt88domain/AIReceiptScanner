import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { authorizeAsset, createAsset, deleteAsset, getAsset } from "@/modules/assets/service";
import type { StorageProvider } from "@/storage";

function createMemoryStorage() {
  const objects = new Map<string, string>();
  const storage = {
    async put(key: string, data: string) {
      objects.set(key, data);
      return { key, size: new TextEncoder().encode(data).byteLength, etag: "test" };
    },
    async get(key: string) {
      const data = objects.get(key);
      if (data === undefined) return null;
      return {
        key,
        size: new TextEncoder().encode(data).byteLength,
        etag: "test",
        body: new ReadableStream(),
        bodyUsed: false,
        arrayBuffer: async () => new TextEncoder().encode(data).buffer,
        text: async () => data,
      };
    },
    async delete(key: string) {
      objects.delete(key);
    },
  } as unknown as StorageProvider;
  return { objects, storage };
}

describe("asset service", () => {
  it("writes R2 metadata, authorizes the owner, and removes both object and record", async () => {
    const db = createDb(env.DB);
    const ownerId = crypto.randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: ownerId,
      name: "Asset owner",
      email: `${ownerId}@example.test`,
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const { objects, storage } = createMemoryStorage();
    const record = await createAsset(db, storage, {
      ownerId,
      visibility: "private",
      storageKey: `covers/${ownerId}.txt`,
      mimeType: "text/plain",
      data: "cover",
    });

    await expect(
      authorizeAsset(db, { assetId: record.id, viewerId: "other-user" }),
    ).resolves.toBeNull();
    await expect(
      getAsset(db, storage, { assetId: record.id, viewerId: ownerId }),
    ).resolves.toMatchObject({
      asset: { id: record.id },
    });
    await expect(deleteAsset(db, storage, { assetId: record.id, ownerId })).resolves.toBe(true);
    expect(objects.has(record.storageKey)).toBe(false);
    await expect(
      getAsset(db, storage, { assetId: record.id, viewerId: ownerId }),
    ).resolves.toBeNull();
  });
});
