import { describe, expect, it } from "vitest";
import { resolveCrossSubdomainCookieDomain } from "../domain";

describe("resolveCrossSubdomainCookieDomain", () => {
  it("uses the Cloudflare account subdomain instead of the workers.dev public suffix", () => {
    expect(
      resolveCrossSubdomainCookieDomain(
        "https://tanstack-template-server.gt88hel.workers.dev",
        "https://tanstack-template-web.gt88hel.workers.dev",
      ),
    ).toBe("gt88hel.workers.dev");
  });

  it("does not share cookies across Cloudflare account subdomains", () => {
    expect(
      resolveCrossSubdomainCookieDomain(
        "https://api.one-account.workers.dev",
        "https://app.other-account.workers.dev",
      ),
    ).toBeUndefined();
  });
});
