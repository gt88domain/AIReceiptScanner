import { env, exports } from "cloudflare:workers";
import {
  beginBillableOperation,
  completeBillableOperation,
  createCreditsService,
  failBillableOperation,
  getBalance,
  grantCredits,
} from "@/credits";
import { createDb } from "@/db";
import { productFeatures } from "@/lib/module-config";
import { describe, expect, it } from "vitest";

const db = createDb(env.DB);

async function createUser(label: string) {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const response = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Billable Operation Test", password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const user = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  expect(user?.id).toBeTruthy();
  return { userId: user!.id };
}

async function fund(user: { userId: string }) {
  await grantCredits(db, {
    user,
    amount: 20,
    sourceProvider: "admin",
    sourceType: "purchase",
    sourceId: `test-funding:${crypto.randomUUID()}`,
  });
}

describe.skipIf(!productFeatures.credits)("billable operations", () => {
  it("does not expose generic credit consumption through the server facade", () => {
    expect(createCreditsService(db)).not.toHaveProperty("consumeCredits");
  });

  it("scopes retries to a user and rejects mismatched requests", async () => {
    const firstUser = await createUser("billable-first");
    const secondUser = await createUser("billable-second");
    await Promise.all([fund(firstUser), fund(secondUser)]);

    const input = {
      feature: "image.generate",
      operationId: "operation-shared-key",
      requestHash: "a".repeat(64),
      calculatedCost: 5,
    };
    const firstBalance = await getBalance(db, firstUser);
    const first = await beginBillableOperation(db, { user: firstUser, ...input });
    expect(first.kind).toBe("started");
    expect((await getBalance(db, firstUser)).balance).toBe(
      firstBalance.balance - input.calculatedCost,
    );

    const retryWhileRunning = await beginBillableOperation(db, { user: firstUser, ...input });
    expect(retryWhileRunning.kind).toBe("running");
    await completeBillableOperation(db, {
      user: firstUser,
      feature: input.feature,
      operationId: input.operationId,
      resultReference: "generated-image:one",
    });
    expect((await beginBillableOperation(db, { user: firstUser, ...input })).kind).toBe(
      "succeeded",
    );

    await expect(
      beginBillableOperation(db, {
        user: firstUser,
        ...input,
        requestHash: "b".repeat(64),
      }),
    ).rejects.toThrow("does not match");

    const second = await beginBillableOperation(db, { user: secondUser, ...input });
    expect(second.kind).toBe("started");
  });

  it("refunds a failed server operation exactly once", async () => {
    const user = await createUser("billable-refund");
    await fund(user);
    const before = await getBalance(db, user);
    const input = {
      user,
      feature: "document.export",
      operationId: "operation-refund-key",
      requestHash: "c".repeat(64),
      calculatedCost: 7,
    };

    expect((await beginBillableOperation(db, input)).kind).toBe("started");
    expect((await getBalance(db, user)).balance).toBe(before.balance - input.calculatedCost);
    await failBillableOperation(db, {
      user,
      feature: input.feature,
      operationId: input.operationId,
      failureReason: "provider timeout",
    });
    await failBillableOperation(db, {
      user,
      feature: input.feature,
      operationId: input.operationId,
      failureReason: "provider timeout",
    });
    expect((await getBalance(db, user)).balance).toBe(before.balance);
  });
});
