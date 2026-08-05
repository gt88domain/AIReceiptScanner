import type { AppCommonConfig } from "./types";

/** Product-owned, browser-safe membership catalog used by entitlement presentation. */
export const productMembershipPlans = [
  {
    id: "pro",
    prices: [
      {
        id: "monthly",
        tier: "monthly",
        priceType: "subscription",
        interval: "month",
        presentationKind: "monthly",
        status: "active",
      },
      {
        id: "yearly",
        tier: "yearly",
        priceType: "subscription",
        interval: "year",
        presentationKind: "yearly",
        status: "active",
      },
    ],
  },
  {
    id: "lifetime",
    prices: [
      {
        id: "lifetime",
        tier: "lifetime",
        priceType: "lifetime",
        interval: null,
        presentationKind: "lifetime",
        status: "active",
      },
    ],
  },
] satisfies AppCommonConfig["membership"]["plans"];
