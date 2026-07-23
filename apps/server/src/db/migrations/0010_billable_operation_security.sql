CREATE TABLE `billable_operation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature` text NOT NULL,
	`operation_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`calculated_cost` integer NOT NULL,
	`status` text NOT NULL,
	`credit_transaction_id` text,
	`result_reference` text,
	`failure_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credit_transaction_id`) REFERENCES `credit_transaction`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billable_operation_user_feature_operation_idx` ON `billable_operation` (`user_id`,`feature`,`operation_id`);
--> statement-breakpoint
CREATE INDEX `billable_operation_user_status_updated_idx` ON `billable_operation` (`user_id`,`status`,`updated_at`);
