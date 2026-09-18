import type { RevenueCatWebhookEvent } from "../types";

export function shouldSyncRevenueCatBillingState(event: RevenueCatWebhookEvent) {
  return event.type !== "PRODUCT_CHANGE";
}
