ALTER TABLE `credit_account` ADD `billing_hold` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `credit_payment_dispute` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_dispute_id` text NOT NULL,
	`provider_payment_id` text,
	`status` text NOT NULL,
	`amount_cents` integer,
	`currency` text,
	`provider_event_at` integer,
	`provider_event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_payment_dispute_provider_id_idx` ON `credit_payment_dispute` (`provider`,`provider_dispute_id`);
--> statement-breakpoint
CREATE INDEX `credit_payment_dispute_user_status_idx` ON `credit_payment_dispute` (`user_id`,`status`);
