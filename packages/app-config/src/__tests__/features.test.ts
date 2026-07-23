import { describe, expect, it } from "vitest";
import { resolveProductFeatures, validateFeatureDependencies } from "../features";

describe("product features", () => {
  it("derives platform capabilities without exposing provider secrets", () => {
    const features = resolveProductFeatures();

    expect(features).toMatchObject({
      auth: true,
      admin: true,
      billing: true,
      credits: true,
      storage: false,
      jobs: true,
      web: { billing: true, credits: true, creditPurchases: true },
      native: { billing: true, credits: true, creditPurchases: true },
    });
  });

  it("rejects credit purchases without billing on the same platform", () => {
    const features = resolveProductFeatures();

    expect(() =>
      validateFeatureDependencies({
        ...features,
        web: { ...features.web, billing: false, creditPurchases: true },
      }),
    ).toThrow("Web credit purchases require web billing");
  });
});
