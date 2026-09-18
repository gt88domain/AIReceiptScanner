import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  findMappedStripeSubscriptionItem,
  findStripeSubscriptionItemByPrice,
} from "@/payments/providers/stripe/subscription-item";

function subscriptionWithItems(items: Array<{ id: string; priceId: string }>): Stripe.Subscription {
  return {
    id: "sub_test",
    items: {
      data: items.map(({ id, priceId }) => ({ id, price: { id: priceId } })),
    },
  } as Stripe.Subscription;
}

describe("Stripe subscription item selection", () => {
  it("selects the current subscription item by provider price instead of position", () => {
    const subscription = subscriptionWithItems([
      { id: "si_addon", priceId: "price_addon" },
      { id: "si_plan", priceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
    ]);

    expect(
      findStripeSubscriptionItemByPrice(subscription, "price_1TciCP4uQgMehpGv3EK50HN9").id,
    ).toBe("si_plan");
  });

  it("rejects an ambiguous subscription item instead of choosing the first one", () => {
    const subscription = subscriptionWithItems([
      { id: "si_monthly", priceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
      { id: "si_yearly", priceId: "price_1TciCw4uQgMehpGvxyfhVKud" },
    ]);

    expect(() => findMappedStripeSubscriptionItem(subscription)).toThrow("exactly one mapped");
  });
});
