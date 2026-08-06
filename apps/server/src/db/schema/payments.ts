import { SUPPORTED_SERVER_PAYMENT_PROVIDERS } from "@repo/app-config";
import { SUBSCRIPTION_STATUSES } from "@repo/app-config/payments/web";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const PAYMENT_OPERATION_TYPES = [
  "checkout",
  "credit_checkout",
  "subscription_upgrade",
] as const;
export const PAYMENT_OPERATION_STATUSES = [
  "pending",
  "processing",
  "provider_succeeded",
  "completed",
  "failed",
  "manual_review",
] as const;

/** Maps RevenueCat App User IDs and aliases to one internal account. */
export const revenueCatIdentity = sqliteTable(
  "revenuecat_identity",
  {
    providerAppUserId: text("provider_app_user_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["active", "transferred"] })
      .notNull()
      .default("active"),
    transferEventId: text("transfer_event_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("revenuecat_identity_user_status_idx").on(table.userId, table.status)],
);

/**
 * Billing customers table - maps internal users to payment provider customers
 * Maintains the relationship between our system and external payment providers
 */
export const billingCustomer = sqliteTable(
  "billing_customer",
  {
    id: text("id").primaryKey(), // Internal customer record ID
    userId: text("user_id").notNull(), // Internal user ID
    provider: text("provider", {
      enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS,
    }).notNull(), // Payment provider
    providerCustomerId: text("provider_customer_id").notNull(), // Customer ID in provider's system
    email: text("email"), // Customer email address
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    // Each user can have only one customer record per provider
    uniqueIndex("billing_customer_user_provider_idx").on(table.userId, table.provider),
    // Each provider customer ID should be unique per provider
    uniqueIndex("billing_customer_provider_customer_id_idx").on(
      table.provider,
      table.providerCustomerId,
    ),
  ],
);

/**
 * Billing subscriptions table - tracks recurring subscription relationships
 * Stores subscription state and links to plans/prices
 */
export const billingSubscription = sqliteTable(
  "billing_subscription",
  {
    id: text("id").primaryKey(), // Internal subscription record ID
    userId: text("user_id").notNull(), // Internal user ID
    provider: text("provider", {
      enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS,
    }).notNull(), // Payment provider handling subscription
    providerSubscriptionId: text("provider_subscription_id").notNull(), // Subscription ID in provider's system
    providerCustomerId: text("provider_customer_id").notNull(), // Customer ID in provider's system
    planId: text("plan_id").notNull(), // Reference to billing plan
    priceId: text("price_id").notNull(), // Reference to billing price
    status: text("status", {
      enum: SUBSCRIPTION_STATUSES,
    }).notNull(), // Current subscription status from provider
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }), // When current billing period ends
    cancelAtPeriodEnd: integer("cancel_at_period_end", {
      mode: "boolean",
    })
      .notNull()
      .default(false), // Whether subscription will cancel at period end
    startedAt: integer("started_at", { mode: "timestamp" }), // When subscription started
    endedAt: integer("ended_at", { mode: "timestamp" }), // When subscription ended (if applicable)
    providerEventAt: integer("provider_event_at", { mode: "timestamp" }), // Latest provider event timestamp applied to this subscription
    providerEventId: text("provider_event_id"), // Stable tie-breaker when provider events share a timestamp
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    // Each provider subscription ID should be unique per provider
    uniqueIndex("billing_subscription_provider_subscription_id_idx").on(
      table.provider,
      table.providerSubscriptionId,
    ),
    index("billing_subscription_user_status_idx").on(table.userId, table.status),
  ],
);

/**
 * Billing checkout sessions table - tracks payment initiation attempts
 * Records when users start the checkout process for audit and debugging
 */
export const billingCheckoutSession = sqliteTable(
  "billing_checkout_session",
  {
    id: text("id").primaryKey(), // Internal checkout session ID
    userId: text("user_id").notNull(), // Internal user ID
    provider: text("provider", {
      enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS,
    }).notNull(), // Payment provider handling checkout
    providerSessionId: text("provider_session_id").notNull(), // Checkout session ID in provider's system
    planId: text("plan_id").notNull(), // Plan being purchased
    priceId: text("price_id").notNull(), // Price being purchased
    mode: text("mode", { enum: ["subscription", "payment"] }).notNull(), // Payment type
    status: text("status", { enum: ["created", "completed", "expired"] })
      .notNull()
      .default("created"), // Current status of checkout session
    expiresAt: integer("expires_at", { mode: "timestamp" }), // When checkout session expires
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    // Each provider session ID should be unique per provider
    uniqueIndex("billing_checkout_session_provider_session_id_idx").on(
      table.provider,
      table.providerSessionId,
    ),
    index("billing_checkout_session_user_created_idx").on(table.userId, table.createdAt),
  ],
);

/** Durable request records for payment-provider side effects and their recovery. */
export const paymentOperation = sqliteTable(
  "payment_operation",
  {
    id: text("id").primaryKey(),
    operationKey: text("operation_key").notNull(),
    scopeKey: text("scope_key"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS }).notNull(),
    operationType: text("operation_type", { enum: PAYMENT_OPERATION_TYPES }).notNull(),
    requestVersion: integer("request_version").notNull().default(1),
    requestHash: text("request_hash").notNull(),
    requestJson: text("request_json").notNull(),
    status: text("status", { enum: PAYMENT_OPERATION_STATUSES }).notNull().default("pending"),
    idempotencyMode: text("idempotency_mode", { enum: ["native", "local_only"] }).notNull(),
    providerResourceId: text("provider_resource_id"),
    resultJson: text("result_json"),
    relatedResourceType: text("related_resource_type", {
      enum: ["checkout_session", "credit_order", "subscription"],
    }),
    relatedResourceId: text("related_resource_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp" }),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    retryable: integer("retryable", { mode: "boolean" }).notNull().default(false),
    lastError: text("last_error"),
    manualReviewCode: text("manual_review_code"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("payment_operation_key_idx").on(table.operationKey),
    index("payment_operation_retry_idx").on(table.status, table.nextRetryAt, table.leaseUntil),
    index("payment_operation_user_created_idx").on(table.userId, table.createdAt),
    index("payment_operation_type_status_idx").on(table.operationType, table.status),
  ],
);

export type PaymentOperation = typeof paymentOperation.$inferSelect;
export type NewPaymentOperation = typeof paymentOperation.$inferInsert;

/**
 * Billing events table - stores webhook events from payment providers
 * Used for idempotency and audit trail of all payment-related events
 */
export const billingEvent = sqliteTable(
  "billing_event",
  {
    id: text("id").primaryKey(), // Internal event record ID
    provider: text("provider", {
      enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS,
    }).notNull(), // Payment provider that sent the event
    providerEventId: text("provider_event_id").notNull(), // Event ID from provider (for idempotency)
    eventType: text("event_type").notNull(), // Type of event (e.g., "invoice.paid")
    processedAt: integer("processed_at", { mode: "timestamp" }).notNull(), // When we processed the event
    payloadJson: text("payload_json").notNull(), // Verified provider event payload as JSON
    handlerVersion: integer("handler_version").notNull().default(1),
    // Processing state for at-least-once delivery. `pending` rows allow providers to safely
    // retry failed handler runs because they stay re-processable until marked `processed`.
    processingStatus: text("processing_status", {
      enum: ["pending", "processing", "processed", "dead_letter"],
    })
      .notNull()
      .default("pending"),
    // Operational timestamps intentionally describe our handling, unlike processedAt,
    // which stores the payment provider's event time for backwards compatibility.
    firstReceivedAt: integer("first_received_at", { mode: "timestamp" }),
    lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    leaseUntil: integer("lease_until", { mode: "timestamp" }),
    leaseToken: text("lease_token"),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    alertedAt: integer("alerted_at", { mode: "timestamp" }),
    alertLeaseToken: text("alert_lease_token"),
    alertLeaseUntil: integer("alert_lease_until", { mode: "timestamp" }),
    deadLetteredAt: integer("dead_lettered_at", { mode: "timestamp" }),
  },
  (table) => [
    // Ensure each provider event is only processed once (idempotency)
    uniqueIndex("billing_event_provider_event_id_idx").on(table.provider, table.providerEventId),
    index("billing_event_pending_alert_idx").on(
      table.processingStatus,
      table.alertedAt,
      table.firstReceivedAt,
    ),
    index("billing_event_retry_idx").on(
      table.processingStatus,
      table.nextRetryAt,
      table.leaseUntil,
    ),
    index("billing_event_alert_lease_idx").on(table.alertedAt, table.alertLeaseUntil),
  ],
);

/**
 * Durable, idempotent external payment effects. Webhook handlers enqueue a job
 * and return; the Worker cron performs provider calls with retry and a lease.
 */
export const billingOutbox = sqliteTable(
  "billing_outbox",
  {
    id: text("id").primaryKey(),
    jobType: text("job_type", { enum: ["cancel_previous_subscription"] }).notNull(),
    provider: text("provider", { enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS }).notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    payloadJson: text("payload_json").notNull(),
    processingStatus: text("processing_status", {
      enum: ["pending", "processing", "processed", "dead_letter"],
    })
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
    lastError: text("last_error"),
    leaseUntil: integer("lease_until", { mode: "timestamp" }),
    leaseToken: text("lease_token"),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    deadLetteredAt: integer("dead_lettered_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("billing_outbox_deduplication_idx").on(table.deduplicationKey),
    index("billing_outbox_retry_idx").on(
      table.processingStatus,
      table.nextRetryAt,
      table.leaseUntil,
    ),
  ],
);

/**
 * Billing purchases table - tracks one-time payments (lifetime purchases)
 * Stores information about completed or attempted one-time payments
 */
export const billingPurchase = sqliteTable(
  "billing_purchase",
  {
    id: text("id").primaryKey(), // Internal purchase record ID
    userId: text("user_id").notNull(), // Internal user ID
    provider: text("provider", {
      enum: SUPPORTED_SERVER_PAYMENT_PROVIDERS,
    }).notNull(), // Payment provider that processed payment
    providerPaymentIntentId: text("provider_payment_intent_id").notNull(), // Payment intent ID in provider's system
    planId: text("plan_id").notNull(), // Plan that was purchased
    priceId: text("price_id").notNull(), // Price that was paid
    status: text("status", {
      enum: ["succeeded", "pending", "failed", "refunded"],
    }).notNull(), // Current status of the purchase
    paidAt: integer("paid_at", { mode: "timestamp" }), // When payment was completed (if succeeded)
    providerEventAt: integer("provider_event_at", { mode: "timestamp" }), // Latest provider event timestamp applied to this purchase
    providerEventId: text("provider_event_id"), // Stable tie-breaker when provider events share a timestamp
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    // Each provider payment intent ID should be unique per provider
    uniqueIndex("billing_purchase_provider_payment_intent_id_idx").on(
      table.provider,
      table.providerPaymentIntentId,
    ),
    index("billing_purchase_user_status_idx").on(table.userId, table.status),
  ],
);
