import type Stripe from "stripe";
import { findPriceByProviderPriceId } from "../../domain/plan-catalog";

export function findStripeSubscriptionItemByPrice(
  subscription: Stripe.Subscription,
  providerPriceId: string,
) {
  const matches = subscription.items.data.filter((item) => item.price.id === providerPriceId);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one Stripe subscription item for price ${providerPriceId}, found ${matches.length}`,
    );
  }
  return matches[0]!;
}

export function findMappedStripeSubscriptionItem(subscription: Stripe.Subscription) {
  const matches = subscription.items.data.flatMap((item) => {
    const price = findPriceByProviderPriceId("stripe", item.price.id);
    return price ? [{ item, price }] : [];
  });
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one mapped Stripe subscription item, found ${matches.length}`,
    );
  }
  return matches[0]!;
}
