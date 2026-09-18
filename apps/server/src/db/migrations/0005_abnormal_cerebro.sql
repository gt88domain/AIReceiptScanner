CREATE TABLE `credit_account` (
	`user_id` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`total_granted` integer DEFAULT 0 NOT NULL,
	`total_consumed` integer DEFAULT 0 NOT NULL,
	`total_expired` integer DEFAULT 0 NOT NULL,
	`total_revoked` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `credit_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`remaining_amount` integer DEFAULT 0 NOT NULL,
	`source_provider` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`package_id` text,
	`expires_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_transaction_source_idx` ON `credit_transaction` (`source_provider`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `credit_transaction_user_created_idx` ON `credit_transaction` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_transaction_user_expiry_idx` ON `credit_transaction` (`user_id`,`expires_at`);