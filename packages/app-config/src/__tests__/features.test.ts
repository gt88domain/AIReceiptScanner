import { describe, expect, it } from "vitest";
import {
  createProductFeatures,
  featureDependencyRules,
  resolveBackofficeVisibility,
  resolveProductFeatures,
  resolveRequiredResources,
  validateFeatureDependencies,
} from "../features";
import { resolveEmailConfig } from "../email-config";
import { resolveCommonConfig } from "../app-config";
import { createProductProfile, productProfiles } from "../product-profiles";
import { resolveConfiguredPaymentProviders } from "../payment-providers";
import { createProfileBuildDescriptor } from "../profile-build-descriptor";
import { createPlatformComposition } from "../platform-composition";
import { resolvePublicRuntimeConfig } from "../public-runtime";

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
      tickets: false,
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

  it("derives composition from explicit capabilities without reading app configuration", () => {
    const features = createProductFeatures({
      jobs: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: false, credits: false, creditPurchases: false },
    });

    expect(
      createPlatformComposition({
        features,
        featureCapabilities: { "report.export": { minimumTier: "free" } },
      }).modules.billing,
    ).toBe(false);
    expect(() =>
      createPlatformComposition({
        features,
        featureCapabilities: { "report.export": { minimumTier: "monthly" } },
      }),
    ).toThrow("[composition:PAID_CAPABILITY_REQUIRES_BILLING]");
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

  it("creates one serializable descriptor for each official profile", () => {
    const fullSaas = createProfileBuildDescriptor("full-saas");
    const directoryLite = createProfileBuildDescriptor("directory-lite");

    expect(fullSaas).toMatchObject({
      profileId: "full-saas",
      requiredResources: ["D1", "R2", "Queue", "DLQ", "Cron"],
      composition: { modules: { billing: true, credits: true, storage: true, jobs: true } },
    });
    expect(directoryLite).toMatchObject({
      profileId: "directory-lite",
      requiredResources: ["D1"],
      composition: { modules: { billing: false, credits: false, storage: false, jobs: false } },
    });
    expect(directoryLite.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.parse(JSON.stringify(directoryLite))).toMatchObject({
      profileId: "directory-lite",
      checksum: directoryLite.checksum,
    });
  });

  it("derives backoffice navigation from each official web profile", () => {
    const visibility = (profile: "full-saas" | "account-app" | "directory-lite") =>
      resolveBackofficeVisibility(createProductProfile(profile));

    expect(visibility("full-saas")).toEqual({
      billing: true,
      credits: true,
      purchases: true,
      payments: true,
      tickets: false,
    });
    expect(visibility("account-app")).toEqual({
      billing: false,
      credits: false,
      purchases: false,
      payments: false,
      tickets: false,
    });
    expect(visibility("directory-lite")).toEqual({
      billing: false,
      credits: false,
      purchases: false,
      payments: false,
      tickets: false,
    });
  });

  it("keeps Tickets off in every official profile until a product explicitly enables it", () => {
    for (const profile of ["full-saas", "account-app", "directory", "directory-lite"] as const) {
      expect(createProductProfile(profile).tickets).toBe(false);
    }
    const tickets = createProductProfile("directory-lite", { tickets: true });
    expect(
      createPlatformComposition({ features: tickets, featureCapabilities: {} }).modules.tickets,
    ).toBe(true);
    expect(resolveBackofficeVisibility(tickets).tickets).toBe(true);
    expect(resolvePublicRuntimeConfig("directory-lite").features.tickets).toBe(false);
    expect(resolvePublicRuntimeConfig("directory-lite", { tickets: true }).features.tickets).toBe(
      true,
    );
  });

  it("derives providers only from enabled, active platform capabilities", () => {
    const features = createProductFeatures({
      mobile: false,
      web: { billing: true, credits: true, creditPurchases: true },
      native: { billing: true, credits: true, creditPurchases: true },
    });
    expect(
      resolveConfiguredPaymentProviders({
        features,
        webPayments: { enabled: true, provider: "stripe", plans: [] },
        webCredits: {
          enabled: true,
          purchasesEnabled: true,
          packages: [
            {
              id: "archived",
              amount: 1,
              status: "archived",
              web: {
                provider: "creem",
                test: { providerPriceId: "test" },
                prod: { providerPriceId: "prod" },
                currency: "usd",
                amountCents: 100,
              },
            },
          ],
        },
        nativePayments: { enabled: true, provider: "revenuecat" },
        nativeCredits: { enabled: true, packages: [] },
      }),
    ).toEqual(["stripe"]);
  });

  it("fails closed for invalid disabled email capability combinations", () => {
    const common = resolveCommonConfig();
    expect(() =>
      resolveEmailConfig({
        ...common,
        email: {
          ...common.email,
          enabled: false,
          provider: "none",
          capabilities: { ...common.email.capabilities, newsletter: true },
        },
      }),
    ).toThrow("[email:DISABLED_CONFIG]");
  });

  it("advertises only the implemented email and password auth path", () => {
    const common = resolveCommonConfig();

    expect(common.auth.methods.emailPasswordEnabled).toBe(true);
    expect("emailOtpEnabled" in common.auth.methods).toBe(false);
    expect(common.email.capabilities).toMatchObject({
      verification: true,
      passwordReset: true,
    });
    expect("emailOtp" in common.email.capabilities).toBe(false);
  });

  it("keeps public content collections disabled by default", () => {
    expect(resolveCommonConfig().features).toMatchObject({ docs: false, blog: false });
  });
});
