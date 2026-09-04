import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { completeCreditOrderPurchase, getBalance } from "@/credits";
import { createDb } from "@/db";
import { creditOrder } from "@/db/schema/credits";
import { productFeatures } from "@/lib/module-config";

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

describe.skipIf(!productFeatures.credits)("credit order fulfillment", () => {
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

  it("fulfills a verified payment that arrives after local order expiration", async () => {
    const user = await createUser();
    const orderId = crypto.randomUUID();
    const now = new Date();
    await db.insert(creditOrder).values({
      id: orderId,
      userId: user.userId,
      packageId: "late-package",
      provider: "stripe",
      providerSessionId: "cs_late",
      providerPaymentId: null,
      status: "expired",
      creditAmount: 23,
      amountCents: 699,
      currency: "usd",
      ledgerTransactionId: null,
      expiresAt: new Date(now.getTime() - 1),
      createdAt: now,
      updatedAt: now,
    });

    await completeCreditOrderPurchase(db, {
      orderId,
      sourceProvider: "stripe",
      sourceId: "pi_late",
      providerSessionId: "cs_late",
      providerPaymentId: "pi_late",
      providerAmountCents: 699,
      providerCurrency: "usd",
    });
    await completeCreditOrderPurchase(db, {
      orderId,
      sourceProvider: "stripe",
      sourceId: "pi_late",
      providerSessionId: "cs_late",
      providerPaymentId: "pi_late",
      providerAmountCents: 699,
      providerCurrency: "usd",
    });

    await expect(getBalance(db, user)).resolves.toMatchObject({ balance: 23 });
  });
});
