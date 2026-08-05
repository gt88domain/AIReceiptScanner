import { describe, expect, it } from "vitest";
import { createProductFeatures } from "@repo/app-config";
import { productFeatures, validateServerModuleEnvironment } from "@/lib/module-config";

const configuredEnv = {
  ADMIN_EMAILS: "admin@example.test",
  BETTER_AUTH_SECRET: "test-only-better-auth-secret",
  REVENUECAT_WEBHOOK_SECRET: "test-revenuecat-webhook-secret",
  RESEND_API_KEY: "re_test_module_check",
  STRIPE_SECRET_KEY: "sk_test_module_check",
  STRIPE_WEBHOOK_SECRET: "whsec_module_check",
};

describe("enabled server modules", () => {
  it("uses the product's shared public contract", () => {
    expect(productFeatures).toMatchObject({
      auth: true,
      admin: true,
    });
  });

  it("can validate an explicit paid feature matrix", () => {
    const paidFeatures = createProductFeatures({
      jobs: true,
      mobile: true,
      native: { billing: true, credits: true, creditPurchases: true },
      web: { billing: true, credits: true, creditPurchases: true },
    });

    expect(() =>
      validateServerModuleEnvironment(configuredEnv, { features: paidFeatures }),
    ).not.toThrow();

    expect(() =>
      validateServerModuleEnvironment(
        {
          ...configuredEnv,
          REVENUECAT_WEBHOOK_SECRET: "",
        },
        { features: paidFeatures },
      ),
    ).toThrow("REVENUECAT_WEBHOOK_SECRET");
  });
});
