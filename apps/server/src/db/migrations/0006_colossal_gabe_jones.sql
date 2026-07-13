CREATE TABLE `credit_order` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`package_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_session_id` text,
	`provider_payment_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`credit_amount` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`ledger_transaction_id` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_order_provider_session_idx` ON `credit_order` (`provider`,`provider_session_id`);--> statement-breakpoint
CREATE INDEX `credit_order_user_created_idx` ON `credit_order` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_order_status_updated_idx` ON `credit_order` (`status`,`updated_at`);