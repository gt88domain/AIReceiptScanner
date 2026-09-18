import assert from "node:assert/strict";
import test from "node:test";
import { isRequestRateLimited } from "./request-rate-limit";

function request(headers: HeadersInit) {
  return new Request("https://server.example/api/contact", { headers });
}

test("Cloudflare-only throttling ignores spoofed proxy headers", () => {
  const namespace = `cf-only-${crypto.randomUUID()}`;

  assert.equal(
    isRequestRateLimited(
      request({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.1" }),
      namespace,
      60_000,
      { cloudflareOnly: true },
    ),
    false,
  );
  assert.equal(
    isRequestRateLimited(
      request({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.2" }),
      namespace,
      60_000,
      { cloudflareOnly: true },
    ),
    true,
  );
  assert.equal(
    isRequestRateLimited(
      request({ "cf-connecting-ip": "203.0.113.2", "x-forwarded-for": "198.51.100.1" }),
      namespace,
      60_000,
      { cloudflareOnly: true },
    ),
    false,
  );
});

test("missing Cloudflare identity shares a limited bucket", () => {
  const namespace = `missing-cf-${crypto.randomUUID()}`;

  assert.equal(
    isRequestRateLimited(request({ "x-forwarded-for": "198.51.100.1" }), namespace, 60_000, {
      cloudflareOnly: true,
    }),
    false,
  );
  assert.equal(
    isRequestRateLimited(request({ "x-forwarded-for": "198.51.100.2" }), namespace, 60_000, {
      cloudflareOnly: true,
    }),
    true,
  );
});
