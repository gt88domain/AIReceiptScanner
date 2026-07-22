import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { completeCreditOrderPurchase, getBalance } from "@/credits";
import { createDb } from "@/db";
import { creditOrder } from "@/db/schema/credits";

const db = createDb(env.DB);

async function createUser() {
  const email = `credit-order-${crypto.randomUUID()}@example.test`;
  const response = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Credit Order Test", password: "test-password-123" }),
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

describe("credit order fulfillment", () => {
  it("fulfills the immutable order snapshot and rejects a mismatched payment amount", async () => {
    const user = await createUser();
    const orderId = crypto.randomUUID();
    const now = new Date();
    await db.insert(creditOrder).values({
      id: orderId,
      userId: user.userId,
      packageId: "retired-package",
      provider: "stripe",
      providerSessionId: "cs_snapshot",
      providerPaymentId: null,
      status: "pending",
      creditAmount: 17,
      amountCents: 499,
      currency: "usd",
      ledgerTransactionId: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      completeCreditOrderPurchase(db, {
        orderId,
        sourceProvider: "stripe",
        sourceId: "pi_snapshot",
        providerSessionId: "cs_snapshot",
        providerPaymentId: "pi_snapshot",
        providerAmountCents: 500,
        providerCurrency: "usd",
      }),
    ).rejects.toThrow("amount does not match");

    await completeCreditOrderPurchase(db, {
      orderId,
      sourceProvider: "stripe",
      sourceId: "pi_snapshot",
      providerSessionId: "cs_snapshot",
      providerPaymentId: "pi_snapshot",
      providerAmountCents: 499,
      providerCurrency: "usd",
    });

    await expect(getBalance(db, user)).resolves.toMatchObject({ balance: 17 });
  });
});
