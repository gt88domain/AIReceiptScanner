CREATE TABLE `receipt` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`capture_id` text NOT NULL,
	`merchant_name` text NOT NULL,
	`purchase_date` text NOT NULL,
	`purchase_time` text,
	`currency` text NOT NULL,
	`subtotal_minor` integer,
	`tax_minor` integer,
	`tip_minor` integer,
	`total_minor` integer NOT NULL,
	`payment_method` text,
	`payment_last4` text,
	`category` text,
	`verification_status` text DEFAULT 'verified' NOT NULL,
	`extraction_source` text DEFAULT 'apple-vision' NOT NULL,
	`local_quality` text,
	`extraction_duration_ms` integer,
	`engine_version` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipt_user_capture_idx` ON `receipt` (`user_id`,`capture_id`);--> statement-breakpoint
CREATE INDEX `receipt_user_purchase_date_idx` ON `receipt` (`user_id`,`purchase_date`);--> statement-breakpoint
CREATE INDEX `receipt_user_created_at_idx` ON `receipt` (`user_id`,`created_at`);
