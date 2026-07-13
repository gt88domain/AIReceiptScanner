/**
 * RevenueCat webhook event types handled by the server integration.
 */
export type RevenueCatWebhookEventType =
  /** A new subscription has been purchased. */
  | "INITIAL_PURCHASE"
  /** A customer has made a purchase that will not auto-renew. */
  | "NON_RENEWING_PURCHASE"
  /** An existing subscription has been renewed or a lapsed user has resubscribed. */
  | "RENEWAL"
  /** A customer has changed their product (e.g., upgraded or downgraded). */
  | "PRODUCT_CHANGE"
  /** A subscription or non-renewing purchase has been cancelled. */
  | "CANCELLATION"
  /** A user has re-enabled auto-renew for a subscription. */
  | "UNCANCELLATION"
  /** There has been a problem trying to charge the user. */
  | "BILLING_ISSUE"
  /** A new app user ID has been registered for an existing subscriber. */
  | "SUBSCRIBER_ALIAS"
  /** A subscription has been paused. */
  | "SUBSCRIPTION_PAUSED"
  /** A subscription has expired and access should be removed. */
  | "EXPIRATION"
  /** A purchase has been transferred to a new App User ID. */
  | "TRANSFER"
  /** A temporary entitlement has been granted to a user. */
  | "TEMPORARY_ENTITLEMENT_GRANT"
  /** A test event sent via the RevenueCat dashboard. */
  | "TEST";

/**
 * Minimal RevenueCat webhook event payload shape used by the backend.
 */
export type RevenueCatWebhookEvent = {
  /** The unique ID of the event */
  id: string;
  /** The type of the webhook event */
  type: RevenueCatWebhookEventType;
  /** The App User ID associated with the event */
  app_user_id?: string | null;
  /** The original App User ID */
  original_app_user_id?: string | null;
  /** A list of aliases for the user */
  aliases?: string[] | null;
  /** A list of entitlement IDs involved in the event */
  entitlement_ids?: string[] | null;
  /** The timestamp of the event in milliseconds */
  event_timestamp_ms: number;
  /** The expiration timestamp in milliseconds, if applicable */
  expiration_at_ms?: number | null;
  /** The purchase timestamp in milliseconds, if applicable */
  purchased_at_ms?: number | null;
  /** The ID of the product associated with the event */
  product_id: string;
  /** The transaction ID, if available */
  transaction_id?: string | null;
  /** The original transaction ID, if available */
  original_transaction_id?: string | null;
  /** The period type of the subscription or purchase */
  period_type?: "TRIAL" | "INTRO" | "NORMAL" | "PROMOTIONAL" | "PREPAID" | null;
  /** The store where the transaction occurred (e.g., app_store, play_store, stripe) */
  store?: string | null;
  /** The reason for cancellation, if applicable */
  cancel_reason?: string | null;
  /** The reason for expiration, if applicable */
  expiration_reason?: string | null;
  /** The ID of the new product, applicable for product changes */
  new_product_id?: string | null;
};

/**
 * Top-level RevenueCat webhook request payload.
 */
export type RevenueCatWebhookEnvelope = {
  /** The API version of the webhook payload */
  api_version: string;
  /** The event details */
  event: RevenueCatWebhookEvent;
};
