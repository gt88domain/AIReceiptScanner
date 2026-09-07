import assert from "node:assert/strict";
import test from "node:test";
import { verifyPublicFormChallenge } from "./public-form-challenge";

test("fails closed when production challenge configuration is missing", async () => {
  const result = await verifyPublicFormChallenge({
    action: "contact",
    env: { NODE_ENV: "production" },
  });

  assert.deepEqual(result, {
    ok: false,
    code: "CHALLENGE_UNAVAILABLE",
    error: "Verification is temporarily unavailable. Please try again.",
    status: 503,
  });
});

test("rejects invalid tokens for both public form actions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: false });

  try {
    for (const action of ["contact", "newsletter"] as const) {
      const result = await verifyPublicFormChallenge({
        action,
        env: { TURNSTILE_SECRET_KEY: "test-secret" },
        token: "fake-token",
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "CHALLENGE_REJECTED");
        assert.equal(result.status, 400);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
