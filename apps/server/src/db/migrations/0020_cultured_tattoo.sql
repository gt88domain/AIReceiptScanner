CREATE TABLE `credit_purchase_recovery_event` (
	`id` text PRIMARY KEY NOT NULL,
	`credit_order_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`recovery_type` text NOT NULL,
	`provider_recovery_id` text NOT NULL,
	`provider_payment_id` text NOT NULL,
	`state` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`provider_event_at` integer,
	`provider_event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`credit_order_id`) REFERENCES `credit_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_purchase_recovery_event_provider_id_idx` ON `credit_purchase_recovery_event` (`provider`,`recovery_type`,`provider_recovery_id`);--> statement-breakpoint
CREATE INDEX `credit_purchase_recovery_event_order_state_idx` ON `credit_purchase_recovery_event` (`credit_order_id`,`state`);--> statement-breakpoint
CREATE INDEX `credit_purchase_recovery_event_provider_payment_idx` ON `credit_purchase_recovery_event` (`provider`,`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `credit_purchase_recovery_event_provider_event_idx` ON `credit_purchase_recovery_event` (`provider_event_at`);--> statement-breakpoint
CREATE TABLE `payment_operation` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_key` text NOT NULL,
	`scope_key` text,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`operation_type` text NOT NULL,
	`request_version` integer DEFAULT 1 NOT NULL,
	`request_hash` text NOT NULL,
	`request_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`idempotency_mode` text NOT NULL,
	`provider_resource_id` text,
	`result_json` text,
	`related_resource_type` text,
	`related_resource_id` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`next_retry_at` integer,
	`retryable` integer DEFAULT false NOT NULL,
	`last_error` text,
	`manual_review_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_operation_key_idx` ON `payment_operation` (`operation_key`);--> statement-breakpoint
CREATE INDEX `payment_operation_retry_idx` ON `payment_operation` (`status`,`next_retry_at`,`lease_until`);--> statement-breakpoint
CREATE INDEX `payment_operation_user_created_idx` ON `payment_operation` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_operation_type_status_idx` ON `payment_operation` (`operation_type`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_operation_active_scope_idx` ON `payment_operation` (`scope_key`) WHERE `scope_key` IS NOT NULL AND `status` IN ('pending','processing','provider_succeeded');--> statement-breakpoint
ALTER TABLE `credit_account` ADD `total_restored` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_order` ADD `recovered_amount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_order` ADD `recovered_credit_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_order` ADD `recovered_spendable_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_order` ADD `recovery_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_order` ADD `recovery_mode` text DEFAULT 'exact' NOT NULL;
