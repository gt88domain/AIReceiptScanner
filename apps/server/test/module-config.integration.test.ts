import { describe, expect, it } from "vitest";
import { productFeatures, validateServerModuleEnvironment } from "@/lib/module-config";

const configuredEnv = {
  ADMIN_EMAILS: "admin@example.test",
  BETTER_AUTH_SECRET: "test-only-better-auth-secret",
  REVENUECAT_WEBHOOK_SECRET: "test-revenuecat-webhook-secret",
  STRIPE_SECRET_KEY: "sk_test_module_check",
  STRIPE_WEBHOOK_SECRET: "whsec_module_check",
};

describe("enabled server modules", () => {
  it("derives billing, credits, and jobs from the shared public contract", () => {
    expect(productFeatures).toMatchObject({
      admin: true,
      billing: true,
      credits: true,
      jobs: true,
      storage: false,
      web: { billing: true, creditPurchases: true },
      native: { billing: true, creditPurchases: true },
    });
  });

  it("requires only the secrets selected by enabled providers", () => {
    expect(() => validateServerModuleEnvironment(configuredEnv)).not.toThrow();

    expect(() =>
      validateServerModuleEnvironment({
        ...configuredEnv,
        REVENUECAT_WEBHOOK_SECRET: "",
      }),
    ).toThrow("REVENUECAT_WEBHOOK_SECRET");
  });
});
