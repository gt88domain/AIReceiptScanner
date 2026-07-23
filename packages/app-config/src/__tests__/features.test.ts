import { describe, expect, it } from "vitest";
import {
  createProductFeatures,
  resolveProductFeatures,
  validateFeatureDependencies,
} from "../features";

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

  it("supports grants-only credits while billing is disabled", () => {
    const features = createProductFeatures({
      jobs: false,
      web: { billing: false, credits: true, creditPurchases: false },
      native: { billing: false, credits: false, creditPurchases: false },
    });

    expect(validateFeatureDependencies(features)).toMatchObject({
      billing: false,
      credits: true,
      jobs: false,
      web: { creditPurchases: false },
    });
  });

  it("rejects billing without jobs and purchases without credits", () => {
    const features = createProductFeatures({
      web: { billing: true, credits: false, creditPurchases: true },
      native: { billing: false, credits: false, creditPurchases: false },
    });

    expect(() => validateFeatureDependencies(features)).toThrow(
      "Web credit purchases require web credits",
    );
    expect(() =>
      validateFeatureDependencies({
        ...features,
        web: { ...features.web, credits: true, creditPurchases: false },
        jobs: false,
      }),
    ).toThrow("Billing requires jobs");
  });
});
