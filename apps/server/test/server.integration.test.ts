import { exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";

const client = createApiClient<AppRouterClient>({
  baseUrl: "https://server.test",
  fetch: (input, init) => exports.default.fetch(input, init),
});

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
    await expect(client.privateData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
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
