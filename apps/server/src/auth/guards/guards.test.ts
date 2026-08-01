import assert from "node:assert/strict";
import test from "node:test";
import { ORPCError } from "@orpc/server";
import type { Context } from "@/lib/context";
import { requireCapability } from ".";

function contextWithCapability(allowed: boolean) {
  const calls: Array<{ userId: string; capability: string }> = [];
  const context = {
    session: { user: { id: "user-1", email: "member@example.com" } },
    db: {
      select: () => ({ from: () => ({ where: async () => [] }) }),
    },
    capabilities: {
      can: async (user: { userId: string }, capability: string) => {
        calls.push({ userId: user.userId, capability });
        return allowed;
      },
    },
  } as unknown as Context;
  return { context, calls };
}

test("requireCapability delegates product access to the capability service", async () => {
  const { context, calls } = contextWithCapability(true);

  const requestUser = await requireCapability(context, "design.generate");

  assert.equal(requestUser.id, "user-1");
  assert.deepEqual(calls, [{ userId: "user-1", capability: "design.generate" }]);
});

test("requireCapability denies a user without the configured capability", async () => {
  const { context } = contextWithCapability(false);

  await assert.rejects(
    () => requireCapability(context, "design.generate"),
    (error: unknown) => error instanceof ORPCError && error.code === "FORBIDDEN",
  );
});
