import type Stripe from "stripe";
import type { Database } from "@/db";
import { findPriceByProviderPriceId } from "../../../domain/plan-catalog";
import type { DbLike } from "../../../infrastructure/repositories/billing-store";
import {
  upsertBillingSubscriptionIfNewer,
  upsertBillingCustomer,
} from "../../../infrastructure/repositories/billing-store";
import type { BillingUser } from "../../../public/types";
import { resolveUserFromMetadata } from "./owner-resolver";

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

  const priceIdFromStripe = subscription.items.data.at(0)?.price.id;
  const mappedPrice = priceIdFromStripe
    ? findPriceByProviderPriceId("stripe", priceIdFromStripe)
    : undefined;

  const planId = mappedPrice?.planId ?? metadata.planId;
  const priceId = mappedPrice?.id ?? metadata.priceId;

  if (!planId || !priceId) {
    console.error("Stripe subscription missing plan or price mapping", {
      providerSubscriptionId: subscription.id,
      priceIdFromStripe,
      metadata,
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
    planId,
    priceId,
    providerEventAt,
    providerEventId,
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
  },
) {
  const status = mapStripeSubscriptionStatus(input.subscription.status);
  const itemPeriodEnd = input.subscription.items.data.at(0)?.current_period_end;
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
    currentPeriodEnd: typeof itemPeriodEnd === "number" ? new Date(itemPeriodEnd * 1000) : null,
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
    case "incomplete":
      return status;
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}
