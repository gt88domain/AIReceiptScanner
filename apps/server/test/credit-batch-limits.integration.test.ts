import { env, exports } from "cloudflare:workers";
import { and, eq, gt } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { beginBillableOperation, expireCredits, grantCredits } from "@/credits";
import { createDb } from "@/db";
import { creditTransaction } from "@/db/schema/credits";
import {
  CREDIT_CONSUMPTION_GRANT_LIMIT,
  CREDIT_EXPIRATION_BATCH_LIMIT,
} from "@/credits/application/internal";

const db = createDb(env.DB);

async function createUser(label: string) {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const response = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Credit Batch Limit Test", password: "test-password-123" }),
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

async function grantOneCreditPerRow(
  user: { userId: string },
  count: number,
  expiresAt: Date | null = null,
) {
  for (let index = 0; index < count; index++) {
    await grantCredits(db, {
      user,
      amount: 1,
      sourceProvider: "admin",
      sourceType: "purchase",
      sourceId: crypto.randomUUID(),
      expiresAt,
    });
  }
}

describe("credit batch limits", () => {
  it("rejects fragmented consumption without partially debiting grants", async () => {
    const user = await createUser("credit-fragmented-consume");
    await grantOneCreditPerRow(user, CREDIT_CONSUMPTION_GRANT_LIMIT + 1);

    await expect(
      beginBillableOperation(db, {
        user,
        feature: "image.generate",
        operationId: crypto.randomUUID(),
        requestHash: "a".repeat(64),
        calculatedCost: 140,
      }),
    ).rejects.toThrow("too fragmented");

    const availableGrants = await db
      .select({ remainingAmount: creditTransaction.remainingAmount })
      .from(creditTransaction)
      .where(
        and(eq(creditTransaction.userId, user.userId), gt(creditTransaction.remainingAmount, 0)),
      );
    expect(availableGrants.reduce((total, grant) => total + grant.remainingAmount, 0)).toBe(
      CREDIT_CONSUMPTION_GRANT_LIMIT + 1,
    );
  });

  it("expires a bounded page and leaves the remainder for the next run", async () => {
    const user = await createUser("credit-expiration-page");
    const now = new Date("2026-07-23T00:00:00.000Z");
    await grantOneCreditPerRow(
      user,
      CREDIT_EXPIRATION_BATCH_LIMIT + 1,
      new Date(now.getTime() - 1),
    );

    const expiration = await expireCredits(db, now);
    expect(expiration).toMatchObject({
      expiredTransactions: CREDIT_EXPIRATION_BATCH_LIMIT,
      expiredAmount: CREDIT_EXPIRATION_BATCH_LIMIT,
      hasMore: true,
    });

    const [remaining] = await db
      .select({ remainingAmount: creditTransaction.remainingAmount })
      .from(creditTransaction)
      .where(
        and(eq(creditTransaction.userId, user.userId), gt(creditTransaction.remainingAmount, 0)),
      );
    expect(remaining?.remainingAmount).toBe(1);
  });
});
