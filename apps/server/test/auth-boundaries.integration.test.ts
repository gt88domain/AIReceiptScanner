import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth";
import { resolveServerRuntimeConfig } from "@/lib/runtime-config";
import { normalizeAvatarUrl, resolveAllowedRemoteAvatarHosts } from "@/auth/avatar-policy";

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

async function signUp(email: string, name = "Identity Boundary Test") {
  const ip = `198.51.100.${crypto.getRandomValues(new Uint8Array(1))[0] ?? 1}`;
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name, password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();

  const signInResponse = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signInResponse.status).toBe(200);
  const cookie = signInResponse.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  expect(cookie).not.toBe("");
  return { client: getSessionClient(cookie), cookie };
}

type AuthRuntimeOverrides = {
  NODE_ENV?: "development" | "production" | "test";
  SERVER_URL?: string;
  WEBSITE_URL?: string;
};

function authOptionsFor(runtimeEnv: AuthRuntimeOverrides) {
  // A distinct proxy prevents the Worker auth cache from reusing test defaults.
  const isolatedD1 = new Proxy(env.DB, {}) as D1Database;
  return createAuth(isolatedD1, resolveServerRuntimeConfig(), {
    ...env,
    ...runtimeEnv,
  } as Cloudflare.Env).options;
}

describe("identity boundaries", () => {
  it("does not expose an email OTP endpoint", async () => {
    const response = await exports.default.fetch(
      "https://server.test/api/auth/email-otp/send-verification-otp",
      {
        body: JSON.stringify({ email: "otp-disabled@example.test", type: "sign-in" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(404);
  });

  it("normalizes untrusted avatar URLs on profile writes", async () => {
    const { client } = await signUp(`avatar-write-${crypto.randomUUID()}@example.test`);

    for (const image of [
      "http://avatars.githubusercontent.com/avatar.png",
      "https://avatars.githubusercontent.com.evil.example/avatar.png",
      "https://user:secret@avatars.githubusercontent.com/avatar.png",
      "https://127.0.0.1/avatar.png",
      "https://untrusted.example/avatar.png",
    ]) {
      await expect(client.users.update({ image })).resolves.toMatchObject({ image: null });
    }
  });

  it("keeps fixed GitHub avatar URLs available", async () => {
    const { client } = await signUp(`avatar-github-${crypto.randomUUID()}@example.test`);
    const image = "https://avatars.githubusercontent.com/octocat";

    await expect(client.users.update({ image })).resolves.toMatchObject({ image });
  });

  it("isolates legacy untrusted avatars from current-user and admin responses", async () => {
    const email = `legacy-avatar-${crypto.randomUUID()}@example.test`;
    const { client, cookie } = await signUp(email);
    const currentUser = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    expect(currentUser).not.toBeNull();
    await env.DB.prepare("UPDATE user SET image = ? WHERE id = ?")
      .bind("https://legacy-attacker.example/avatar.png", currentUser?.id)
      .run();

    await expect(client.users.getCurrentUser()).resolves.toMatchObject({ image: null });
    const sessionResponse = await exports.default.fetch(
      "https://server.test/api/auth/get-session?disableCookieCache=true",
      { headers: { cookie } },
    );
    await expect(sessionResponse.json()).resolves.toMatchObject({ user: { image: null } });
    const { client: adminClient } = await signUp("admin@example.test");
    await expect(adminClient.admin.listUsers({ name: email })).resolves.toMatchObject({
      data: [expect.objectContaining({ id: currentUser?.id, image: null })],
    });
  });

  it("keeps localhost cookies HttpOnly", () => {
    const options = authOptionsFor({
      NODE_ENV: "development",
      SERVER_URL: "http://localhost:3001",
      WEBSITE_URL: "http://localhost:3000",
    });

    expect(options.advanced?.defaultCookieAttributes?.secure).toBe(false);
    expect(options.advanced?.defaultCookieAttributes?.httpOnly).toBe(true);
  });

  it("rejects production Auth URLs that are not HTTPS", () => {
    expect(() =>
      authOptionsFor({
        NODE_ENV: "production",
        SERVER_URL: "http://api.example.test",
        WEBSITE_URL: "https://app.example.test",
      }),
    ).toThrow("AUTH_PRODUCTION_URL_NOT_HTTPS");
  });

  it("accepts the exact HTTPS Storage host without accepting its suffixes", () => {
    const allowedHosts = resolveAllowedRemoteAvatarHosts("https://assets.example.test");

    expect(
      normalizeAvatarUrl(
        "https://assets.example.test/api/storage/r2/avatars/user/avatar.png",
        allowedHosts,
      ),
    ).toBe("https://assets.example.test/api/storage/r2/avatars/user/avatar.png");
    expect(
      normalizeAvatarUrl("https://assets.example.test.evil.example/avatar.png", allowedHosts),
    ).toBeNull();
  });

  it("trusts only Cloudflare client IP headers in production", () => {
    const options = authOptionsFor({
      NODE_ENV: "production",
      SERVER_URL: "https://api.example.test",
      WEBSITE_URL: "https://app.example.test",
    });

    expect(options.advanced?.ipAddress?.ipAddressHeaders).toEqual(["cf-connecting-ip"]);
  });

  it("makes account-linking ownership defaults explicit", () => {
    const options = authOptionsFor({ NODE_ENV: "test" });
    const accountLinking = options.account?.accountLinking;

    expect(accountLinking).toMatchObject({
      enabled: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      trustedProviders: ["google", "github"],
      updateUserInfoOnLink: false,
    });
  });

  it("normalizes a provider-supplied image without changing the local profile fields", async () => {
    const options = authOptionsFor({ NODE_ENV: "test" });
    const beforeUpdate = options.databaseHooks?.user?.update?.before;
    expect(beforeUpdate).toBeTypeOf("function");

    const result = await beforeUpdate?.(
      {
        email: "local@example.test",
        emailVerified: true,
        image: "https://provider-attacker.example/avatar.png",
        name: "Local profile name",
      },
      {} as never,
    );
    expect(result).toEqual({
      data: {
        email: "local@example.test",
        emailVerified: true,
        image: null,
        name: "Local profile name",
      },
    });
  });

  it("keeps deleted-user sessions from authorizing application requests", async () => {
    const email = `deleted-user-${crypto.randomUUID()}@example.test`;
    const { client } = await signUp(email);

    await expect(client.users.deleteAccount()).resolves.toEqual({ success: true });
    await expect(client.users.getCurrentUser()).resolves.toBeNull();
  });

  it("refuses a fresh session for a soft-deleted Auth record", async () => {
    const email = `deleted-session-${crypto.randomUUID()}@example.test`;
    await signUp(email);
    await env.DB.prepare("UPDATE user SET deleted_at = ? WHERE email = ?")
      .bind(Date.now(), email)
      .run();

    const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
      body: JSON.stringify({ email, password: "test-password-123" }),
      headers: { "CF-Connecting-IP": "198.51.100.9", "Content-Type": "application/json" },
      method: "POST",
    });
    expect(response.status).toBe(401);
  });
});
