import type { Database } from "@/db";
import { getBillingStatus, listPlans } from "./billing-status";
import { createCheckoutSession } from "./checkout";
import { createPortalSession } from "./portal";
import type {
  CreateCheckoutServiceInput,
  CreatePortalServiceInput,
  HandleWebhookInput,
  UpgradeSubscriptionServiceInput,
} from "./types";
import { upgradeSubscription } from "./upgrade";
import { handleWebhookEvent } from "./webhook-dispatch";

/** Public facade that keeps the payment service API stable. */
export function createPaymentService(db: Database) {
  return {
    listPlans,
    getBillingStatus: (user: Parameters<typeof getBillingStatus>[1]) => getBillingStatus(db, user),
    createCheckoutSession: (input: CreateCheckoutServiceInput) => createCheckoutSession(db, input),
    upgradeSubscription: (input: UpgradeSubscriptionServiceInput) => upgradeSubscription(db, input),
    createPortalSession: (input: CreatePortalServiceInput) => createPortalSession(db, input),
    handleWebhookEvent: (input: HandleWebhookInput) => handleWebhookEvent(db, input),
  };
}
