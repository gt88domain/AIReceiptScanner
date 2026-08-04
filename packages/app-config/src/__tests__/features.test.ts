import { describe, expect, it } from "vitest";
import {
  createProductFeatures,
  featureDependencyRules,
  resolveProductFeatures,
  resolveRequiredResources,
  validateFeatureDependencies,
} from "../features";
import { createProductProfile, productProfiles } from "../product-profiles";

describe("product features", () => {
  it("derives a public capability contract without exposing provider secrets", () => {
    const features = resolveProductFeatures();

    expect(features).toMatchObject({
      auth: true,
      admin: expect.any(Boolean),
      billing: expect.any(Boolean),
      credits: expect.any(Boolean),
      storage: expect.any(Boolean),
      jobs: expect.any(Boolean),
      mobile: false,
      web: {
        billing: expect.any(Boolean),
        credits: expect.any(Boolean),
        creditPurchases: expect.any(Boolean),
      },
      native: {
        billing: expect.any(Boolean),
        credits: expect.any(Boolean),
        creditPurchases: expect.any(Boolean),
      },
    });
    expect(JSON.stringify(features)).not.toContain("SECRET");
  });

  it("preserves the v0.4.0 direct appConfig defaults", () => {
    expect(resolveProductFeatures()).toEqual({
      auth: true,
      admin: true,
      jobs: true,
      storage: false,
      mobile: false,
      billing: true,
      credits: true,
      web: { billing: true, credits: true, creditPurchases: true },
      native: { billing: false, credits: false, creditPurchases: false },
    });
  });

  it("rejects credit purchases without billing on the same platform", () => {
    const features = createProductFeatures({
      web: { billing: true, credits: true, creditPurchases: true },
      native: { billing: false, credits: false, creditPurchases: false },
    });

    expect(() =>
      validateFeatureDependencies({
        ...features,
        web: { ...features.web, billing: false, creditPurchases: true },
      }),
    ).toThrow("[features:WEB_CREDIT_PURCHASES_REQUIRE_BILLING]");
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

  it("does not activate native capabilities until mobile is enabled", () => {
    const features = createProductFeatures({
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: true, credits: true, creditPurchases: true },
    });

    expect(features).toMatchObject({
      mobile: false,
      billing: false,
      credits: false,
      native: { billing: false, credits: false, creditPurchases: false },
    });
  });

  it("activates native capabilities only with the mobile flag", () => {
    const features = createProductFeatures({
      mobile: true,
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: true, credits: true, creditPurchases: true },
    });

    expect(features).toMatchObject({
      mobile: true,
      billing: true,
      credits: true,
      native: { billing: true, credits: true, creditPurchases: true },
    });
  });

  it("rejects billing without jobs and purchases without credits", () => {
    const features = createProductFeatures({
      web: { billing: true, credits: false, creditPurchases: true },
      native: { billing: false, credits: false, creditPurchases: false },
    });

    expect(() => validateFeatureDependencies(features)).toThrow(
      "[features:WEB_CREDIT_PURCHASES_REQUIRE_CREDITS]",
    );
    expect(() =>
      validateFeatureDependencies({
        ...features,
        web: { ...features.web, credits: true, creditPurchases: false },
        jobs: false,
      }),
    ).toThrow("[features:BILLING_REQUIRES_JOBS]");
  });

  it("rejects explicit native runtime features without mobile", () => {
    const features = createProductFeatures({
      mobile: true,
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: true, credits: false, creditPurchases: false },
    });

    expect(() => validateFeatureDependencies({ ...features, mobile: false })).toThrow(
      `[features:${featureDependencyRules.NATIVE_BILLING_REQUIRES_MOBILE.code}]`,
    );
  });

  it("provides validated, additive product profiles", () => {
    expect(productProfiles["full-saas"].features).toMatchObject({
      jobs: true,
      storage: true,
      web: { billing: true, credits: true, creditPurchases: true },
      mobile: false,
    });
    expect(createProductProfile("account-app", { storage: false })).toMatchObject({
      admin: true,
      jobs: true,
      storage: false,
      billing: false,
      credits: false,
    });
    expect(createProductProfile("directory")).toMatchObject({
      jobs: true,
      storage: false,
      billing: false,
      credits: false,
    });
    expect(createProductProfile("directory-lite")).toMatchObject({
      admin: true,
      jobs: false,
      storage: false,
      billing: false,
      credits: false,
    });
    expect(productProfiles["directory-lite"].expectedResources).toEqual(["D1"]);
  });

  it("derives required resources from feature changes", () => {
    const base = createProductFeatures({
      jobs: false,
      storage: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: false, credits: false, creditPurchases: false },
    });
    expect(resolveRequiredResources(base)).toEqual(["D1"]);
    expect(resolveRequiredResources({ ...base, jobs: true, storage: true })).toEqual([
      "D1",
      "R2",
      "Queue",
      "DLQ",
      "Cron",
    ]);
  });

  it("does not let a profile override bypass dependency validation", () => {
    expect(() => createProductProfile("full-saas", { jobs: false })).toThrow(
      "[features:BILLING_REQUIRES_JOBS]",
    );
  });
});
