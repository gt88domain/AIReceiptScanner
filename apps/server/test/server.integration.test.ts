import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";

const client = createApiClient<AppRouterClient>({
  baseUrl: "https://server.test",
  fetch: (input, init) => exports.default.fetch(input, init),
});

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

describe("server Worker", () => {
  it("serves the health endpoint with baseline security headers", async () => {
    const response = await exports.default.fetch("https://server.test/");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "tanstack-template API",
    });
  });

  it("does not allow an untrusted origin to read API responses", async () => {
    const response = await exports.default.fetch("https://server.test/api/unknown", {
      headers: { Origin: "https://attacker.example" },
      method: "OPTIONS",
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects unauthenticated access to protected procedures", async () => {
    await expect(client.credits.getBalance()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("requires an active subscription to be cancelled before account deletion", async () => {
    const email = "subscribed-delete@example.test";
    const signedInClient = await signUp(email);
    const user = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    expect(user).not.toBeNull();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO billing_subscription (
          id, user_id, provider, provider_subscription_id, provider_customer_id,
          plan_id, price_id, status, cancel_at_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "subscribed-delete-subscription",
        user?.id,
        "stripe",
        "subscribed-delete-provider-subscription",
        "subscribed-delete-provider-customer",
        "pro",
        "monthly",
        "active",
        0,
        now,
        now,
      )
      .run();

    await expect(signedInClient.users.deleteAccount()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("returns not found for a missing public storage object", async () => {
    const response = await exports.default.fetch(
      "https://server.test/api/storage/r2/avatars/no-such-file.png",
    );

    expect(response.status).toBe(404);
  });

  it("adds a valid footer newsletter subscription to Resend Contacts", async () => {
    const response = await exports.default.fetch("https://server.test/api/newsletter/subscribe", {
      body: JSON.stringify({ email: "reader@example.com" }),
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.10" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ subscribed: true });
  });

  it("rejects an invalid newsletter email before contacting Resend", async () => {
    const response = await exports.default.fetch("https://server.test/api/newsletter/subscribe", {
      body: JSON.stringify({ email: "not-an-email" }),
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.11" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });

  it("throttles repeated newsletter submissions from one IP", async () => {
    const request = () =>
      exports.default.fetch("https://server.test/api/newsletter/subscribe", {
        body: JSON.stringify({ email: "throttled@example.com" }),
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.12" },
        method: "POST",
      });

    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
  });
});
