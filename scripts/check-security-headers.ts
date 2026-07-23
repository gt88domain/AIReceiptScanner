import assert from "node:assert/strict";
import { applySecurityHeaders } from "../apps/web/src/server/security-headers";

const response = applySecurityHeaders(new Response("ok"));

assert.equal(response.headers.get("Content-Security-Policy"), "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
assert.equal(response.headers.get("Permissions-Policy"), "camera=(), geolocation=(), microphone=()");
assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=31536000");
assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(response.headers.get("X-Frame-Options"), "DENY");
