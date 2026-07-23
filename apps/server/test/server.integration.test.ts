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

async function signUp(email: string, name = "Integration Test") {
  const ip = `198.51.${crypto.getRandomValues(new Uint8Array(1))[0]}.${crypto.getRandomValues(new Uint8Array(1))[0]}`;
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name, password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();

  const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
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

  it("enforces Better Auth's shared sign-in limit", async () => {
    const ip = `198.51.100.${crypto.getRandomValues(new Uint8Array(1))[0] ?? 1}`;
    const response = () =>
      exports.default.fetch("https://server.test/api/auth/sign-in/email", {
        body: JSON.stringify({ email: "rate-limit@example.test", password: "wrong-password" }),
        headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
        method: "POST",
      });

    expect((await response()).status).toBe(401);
    expect((await response()).status).toBe(401);
    expect((await response()).status).toBe(401);
    expect((await response()).status).toBe(429);
  });

  it("does not expose the admin user directory to an ordinary user", async () => {
    const signedInClient = await signUp("ordinary-user@example.test");

    await expect(signedInClient.admin.listUsers({})).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("treats LIKE wildcard characters in an admin user search literally", async () => {
    const adminClient = await signUp("admin@example.test");
    const literalName = `literal%needle-${crypto.randomUUID()}`;
    await signUp(`literal-percent-${crypto.randomUUID()}@example.test`, literalName);
    await signUp(
      `literal-decoy-${crypto.randomUUID()}@example.test`,
      literalName.replace("%", "X"),
    );

    await expect(adminClient.admin.listUsers({ name: literalName })).resolves.toMatchObject({
      total: 1,
      data: [expect.objectContaining({ name: literalName })],
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

  it("updates the avatar reference before deleting the replaced object", async () => {
    const email = "avatar-update@example.test";
    const signedInClient = await signUp(email);
    const currentUser = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    expect(currentUser).not.toBeNull();

    const oldKey = `avatars/${currentUser?.id}/old-avatar.png`;
    const newKey = `avatars/${currentUser?.id}/new-avatar.png`;
    const oldUrl = `${env.SERVER_URL}/api/storage/r2/${oldKey}`;
    const newUrl = `${env.SERVER_URL}/api/storage/r2/${newKey}`;
    await env.STORAGE.put(oldKey, "old avatar");
    await env.STORAGE.put(newKey, "new avatar");
    await env.DB.prepare("UPDATE user SET image = ? WHERE id = ?")
      .bind(oldUrl, currentUser?.id)
      .run();

    await expect(signedInClient.users.update({ image: newUrl })).resolves.toMatchObject({
      image: newUrl,
    });
    await expect(env.STORAGE.get(oldKey)).resolves.toBeNull();
    await expect(env.STORAGE.get(newKey)).resolves.not.toBeNull();
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

  it("delivers a valid contact message to the support inbox", async () => {
    const response = await exports.default.fetch("https://server.test/api/contact", {
      body: JSON.stringify({
        name: "Template Buyer",
        email: "buyer@example.com",
        message: "I have a question about adapting this template.",
      }),
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.21" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
  });

  it("rejects invalid contact input before sending email", async () => {
    const response = await exports.default.fetch("https://server.test/api/contact", {
      body: JSON.stringify({ name: "A", email: "not-an-email", message: "short" }),
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.22" },
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
