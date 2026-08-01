import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

async function signUp(email: string) {
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Integration Test", password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();

  const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);

  const setCookies = response.headers.getSetCookie();
  const cookie = (setCookies.length > 0 ? setCookies : [response.headers.get("set-cookie") ?? ""])
    .filter(Boolean)
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  expect(cookie).not.toBe("");
  return getSessionClient(cookie);
}

describe("administrator RPC authorization", () => {
  it("denies a signed-in non-admin before reading operational data", async () => {
    const client = await signUp("ordinary@example.test");

    await expect(client.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("permits only the Worker-secret allowlisted email", async () => {
    const client = await signUp("admin@example.test");

    await expect(client.admin.getAccess()).resolves.toEqual({ isAdmin: true });
    await expect(client.admin.overview()).resolves.toMatchObject({
      stats: { users: expect.any(Number) },
    });
  });

  it("does not promote a paid user to administrator", async () => {
    const email = "paid@example.test";
    const client = await signUp(email);
    const account = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first<{
      id: string;
    }>();
    expect(account).not.toBeNull();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO billing_subscription (
          id, user_id, provider, provider_subscription_id, provider_customer_id,
          plan_id, price_id, status, cancel_at_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "paid-user-subscription",
        account?.id,
        "stripe",
        "paid-user-provider-subscription",
        "paid-user-provider-customer",
        "pro",
        "monthly",
        "active",
        0,
        now,
        now,
      )
      .run();

    await expect(client.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
