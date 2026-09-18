import { describe, expect, it } from "vitest";
import { webConfig } from "./web-config";

/**
 * Regression guard for the two-state content surface contract:
 * capability (docs/blogEnabled) and public visibility (docs/blogPublic) must
 * stay separate so navigation, sitemap, and search entries never appear
 * before the product both enables the surface and publishes content.
 */
describe("webConfig content surface flags", () => {
  it("keeps the docs/blog capability off by default", () => {
    expect(webConfig.docsEnabled).toBe(false);
    expect(webConfig.blogEnabled).toBe(false);
  });

  it("keeps public content entries off while no content is published", () => {
    expect(webConfig.docsPublic).toBe(false);
    expect(webConfig.blogPublic).toBe(false);
  });
});

describe("webConfig auth methods", () => {
  it("exposes email and password without a dormant OTP switch", () => {
    expect(webConfig.auth.publicSignupEnabled).toBe(true);
    expect(webConfig.auth.methods.emailPasswordEnabled).toBe(true);
    expect("emailOtpEnabled" in webConfig.auth.methods).toBe(false);
  });
});

describe("webConfig public navigation", () => {
  it("does not invent product routes", () => {
    expect(webConfig.publicNavigation).toEqual([]);
  });
});
