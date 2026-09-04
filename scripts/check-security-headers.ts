import assert from "node:assert/strict";
import { applySecurityHeaders } from "../apps/web/src/server/security-headers";

const response = applySecurityHeaders(new Response("ok"));

assert.equal(
  response.headers.get("Content-Security-Policy"),
  "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.google-analytics.com https://*.openpanel.dev https://challenges.cloudflare.com; font-src 'self' data:; frame-ancestors 'none'; frame-src https://challenges.cloudflare.com; img-src 'self' data: https:; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'",
);
assert.equal(response.headers.get("Permissions-Policy"), "camera=(), geolocation=(), microphone=()");
assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(
  response.headers.get("Strict-Transport-Security"),
  "max-age=31536000; includeSubDomains",
);
assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(response.headers.get("X-Frame-Options"), "DENY");
