import { afterEach, describe, expect, it, vi } from "vitest";

describe("native payments config", () => {
  afterEach(() => {
    vi.doUnmock("../payments/web");
    vi.resetModules();
  });

  it("validates native plan semantics without resolving web provider price IDs", async () => {
    vi.resetModules();
    // The mock fails if native validation calls the web normalizer instead of reading semantics.
    vi.doMock("../payments/web", () => ({
      paymentsConfig: {
        plans: [
          {
            id: "pro",
            prices: [
              {
                id: "monthly",
                priceType: "subscription",
                interval: "month",
                status: "active",
              },
            ],
          },
        ],
      },
      normalizePaymentsConfig: () => {
        throw new Error("web provider price IDs should not be resolved for native validation");
      },
    }));

    const { normalizeNativePaymentsConfig } = await import("../payments/native");

    expect(() =>
      normalizeNativePaymentsConfig(
        {
          ios: {
            plans: [
              {
                id: "pro",
                prices: [
                  {
                    id: "monthly",
                    provider: "revenuecat",
                    providerPriceId: "ios_monthly",
                    currency: "usd",
                    amountCents: 1000,
                    priceType: "subscription",
                    interval: "month",
                    status: "active",
                  },
                ],
              },
            ],
          },
        },
        "ios",
      ),
    ).not.toThrow();
  });
});
