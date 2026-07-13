import { describe, expect, it } from "vitest";
import {
  resolveCommonConfig,
  resolveNativeCommonConfig,
  resolveWebCommonConfig,
} from "../app-config";
import { mergeCreditsConfigs, normalizeCreditsConfig } from "../credits";

describe("platform credit config", () => {
  it("keeps credits on platform config instead of common config", () => {
    expect("credits" in resolveCommonConfig()).toBe(false);
    expect(resolveWebCommonConfig().credits).toBeDefined();
    expect(resolveNativeCommonConfig().credits).toBeDefined();
  });

  it("merges enabled platform credit packages without leaking disabled platform packages", () => {
    const merged = mergeCreditsConfigs([
      {
        enabled: false,
        packages: [
          {
            id: "starter",
            amount: 100,
            web: {
              provider: "stripe",
              test: { providerPriceId: "price_web_test" },
              prod: { providerPriceId: "price_web_prod" },
              currency: "usd",
              amountCents: 499,
            },
          },
        ],
      },
      {
        enabled: true,
        packages: [
          {
            id: "starter",
            amount: 100,
            native: {
              ios: {
                provider: "revenuecat",
                providerProductId: "starter_ios",
                currency: "usd",
                amountCents: 499,
              },
            },
          },
        ],
      },
    ]);

    const [creditPackage] = normalizeCreditsConfig(merged).packages;

    expect(merged.enabled).toBe(true);
    expect(creditPackage?.web).toBeNull();
    expect(creditPackage?.native.ios?.providerProductId).toBe("starter_ios");
    expect(creditPackage).not.toHaveProperty("titleKey");
    expect(creditPackage).not.toHaveProperty("descriptionKey");
  });
});
