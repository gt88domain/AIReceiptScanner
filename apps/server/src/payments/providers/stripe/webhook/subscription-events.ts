import type Stripe from "stripe";
import type { Database } from "@/db";
import type { DbLike } from "../../../infrastructure/repositories/billing-store";
import {
  upsertBillingSubscriptionIfNewer,
  upsertBillingCustomer,
} from "../../../infrastructure/repositories/billing-store";
import type { BillingUser } from "../../../public/types";
import { resolveUserFromMetadata } from "./owner-resolver";
import { findMappedStripeSubscriptionItem } from "../subscription-item";

/**
 * Handles subscription create/update/delete events from Stripe.
 */
export async function handleStripeSubscription(
  db: Database,
  subscription: Stripe.Subscription,
  providerEventAt: Date,
  providerEventId: string,
) {
  const metadata = subscription.metadata ?? {};
  const providerCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const user = await resolveUserFromMetadata(db, {
    metadata,
    providerCustomerId,
  });

  if (!user || !providerCustomerId) {
    console.error("Stripe subscription missing user or customer id", {
      providerSubscriptionId: subscription.id,
      providerCustomerId,
      metadata,
    });
    return;
  }

  let mappedItem: ReturnType<typeof findMappedStripeSubscriptionItem>;
  try {
    mappedItem = findMappedStripeSubscriptionItem(subscription);
  } catch (error) {
    console.error("Stripe subscription has an ambiguous plan item", {
      providerSubscriptionId: subscription.id,
      itemPriceIds: subscription.items.data.map((item) => item.price.id),
      metadata,
      error,
    });
    return;
  }

  await upsertBillingCustomer(db, {
    user,
    provider: "stripe",
    providerCustomerId,
    email: null,
  });

  await upsertSubscriptionFromStripe(db, {
    user,
    subscription,
    planId: mappedItem.price.planId,
    priceId: mappedItem.price.id,
    providerEventAt,
    providerEventId,
    subscriptionItem: mappedItem.item,
  });
}

/**
 * Upserts local subscription rows from Stripe subscription payload.
 */
async function upsertSubscriptionFromStripe(
  db: DbLike,
  input: {
    user: BillingUser;
    subscription: Stripe.Subscription;
    planId: string;
    priceId: string;
    providerEventAt: Date;
    providerEventId: string;
    subscriptionItem: Stripe.SubscriptionItem;
  },
) {
  const status = mapStripeSubscriptionStatus(input.subscription.status);
  const applied = await upsertBillingSubscriptionIfNewer(db, {
    userId: input.user.userId,
    provider: "stripe" as const,
    providerSubscriptionId: input.subscription.id,
    providerCustomerId:
      typeof input.subscription.customer === "string"
        ? input.subscription.customer
        : (input.subscription.customer?.id ?? ""),
    planId: input.planId,
    priceId: input.priceId,
    status,
    currentPeriodEnd:
      typeof input.subscriptionItem.current_period_end === "number"
        ? new Date(input.subscriptionItem.current_period_end * 1000)
        : null,
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end ?? false,
    startedAt: input.subscription.start_date
      ? new Date(input.subscription.start_date * 1000)
      : null,
    endedAt: input.subscription.ended_at ? new Date(input.subscription.ended_at * 1000) : null,
    providerEventAt: input.providerEventAt,
    providerEventId: input.providerEventId,
  });

  return Boolean(applied);
}

/**
 * Normalizes Stripe subscription status to local subscription status.
 */
function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "paused":
    case "incomplete":
      return status;
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}
