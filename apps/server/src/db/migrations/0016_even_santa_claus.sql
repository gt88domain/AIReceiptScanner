CREATE TABLE `billing_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`provider` text NOT NULL,
	`deduplication_key` text NOT NULL,
	`payload_json` text NOT NULL,
	`processing_status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` integer,
	`last_error` text,
	`lease_until` integer,
	`next_retry_at` integer,
	`dead_lettered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_outbox_deduplication_idx` ON `billing_outbox` (`deduplication_key`);
--> statement-breakpoint
CREATE INDEX `billing_outbox_retry_idx` ON `billing_outbox` (`processing_status`,`next_retry_at`,`lease_until`);
--> statement-breakpoint
ALTER TABLE `billing_event` ADD `handler_version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `billing_event` ADD `dead_lettered_at` integer;
--> statement-breakpoint
CREATE INDEX `billing_event_retry_idx` ON `billing_event` (`processing_status`,`next_retry_at`,`lease_until`);
--> statement-breakpoint
CREATE INDEX `billing_purchase_user_status_idx` ON `billing_purchase` (`user_id`,`status`);
--> statement-breakpoint
CREATE INDEX `billing_subscription_user_status_idx` ON `billing_subscription` (`user_id`,`status`);
--> statement-breakpoint
CREATE INDEX `billing_checkout_session_user_created_idx` ON `billing_checkout_session` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);
--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);
--> statement-breakpoint
CREATE INDEX `verification_identifier_expires_idx` ON `verification` (`identifier`,`expires_at`);
