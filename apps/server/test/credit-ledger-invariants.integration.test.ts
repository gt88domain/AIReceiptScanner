import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("credit ledger database invariants", () => {
  it("rejects negative aggregate counters and remaining grant amounts", async () => {
    const userId = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO user (id, name, email, email_verified, phone_number_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, "Ledger Test", `${userId}@example.test`, 1, 0, now, now)
      .run();

    await expect(
      env.DB.prepare(
        `INSERT INTO credit_account (
          user_id, balance, total_granted, total_consumed, total_expired, total_revoked,
          billing_hold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(userId, 0, -1, 0, 0, 0, 0, now, now)
        .run(),
    ).rejects.toThrow("credit account counters must be non-negative");

    await expect(
      env.DB.prepare(
        `INSERT INTO credit_transaction (
          id, user_id, amount, remaining_amount, source_provider, source_type, source_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          userId,
          1,
          -1,
          "system",
          "signup_grant",
          crypto.randomUUID(),
          now,
          now,
        )
        .run(),
    ).rejects.toThrow("credit transaction remaining amount must be non-negative");
  });
});
