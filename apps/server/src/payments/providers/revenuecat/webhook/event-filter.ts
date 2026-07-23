import type { RevenueCatWebhookEvent } from "../types";

export function shouldIgnoreRevenueCatEvent(event: RevenueCatWebhookEvent) {
  return event.type === "TEST";
}
