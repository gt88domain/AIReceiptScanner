import assert from "node:assert/strict";
import test from "node:test";
import { createR2StorageProvider } from "./r2";

test("R2 listing never collects more than the requested bounded limit", async () => {
  const requestedLimits: Array<number | undefined> = [];
  const bucket = {
    list: async (options: R2ListOptions) => {
      requestedLimits.push(options.limit);
      return {
        objects: Array.from({ length: options.limit ?? 0 }, (_, index) => ({
          key: `avatars/user-a/${index}.png`,
          size: index,
          etag: `etag-${index}`,
          uploaded: new Date(index),
        })),
        truncated: true,
        cursor: "next-page",
        delimitedPrefixes: [],
      };
    },
  } as unknown as R2Bucket;

  const provider = createR2StorageProvider({ bucket });
  const objects = await provider.list({ prefix: "avatars/user-a/", limit: 5 });

  assert.equal(objects.length, 5);
  assert.deepEqual(requestedLimits, [5]);
});

test("R2 listing defaults and clamps to one hundred objects", async () => {
  const requestedLimits: Array<number | undefined> = [];
  const bucket = {
    list: async (options: R2ListOptions) => {
      requestedLimits.push(options.limit);
      return { objects: [], truncated: false, delimitedPrefixes: [] };
    },
  } as unknown as R2Bucket;

  const provider = createR2StorageProvider({ bucket });
  await provider.list({ prefix: "avatars/user-a/", limit: 1_000 });

  assert.deepEqual(requestedLimits, [100]);
});
