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
      service: "easystarter API",
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
});
