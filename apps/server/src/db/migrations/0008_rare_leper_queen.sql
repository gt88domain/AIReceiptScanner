CREATE TABLE `credit_signup_grant_claim` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email_hash` text NOT NULL,
	`ip_hash` text,
	`user_agent_hash` text,
	`granted_amount` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `credit_signup_grant_claim_user_status_idx` ON `credit_signup_grant_claim` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `credit_signup_grant_claim_email_status_idx` ON `credit_signup_grant_claim` (`email_hash`,`status`);--> statement-breakpoint
CREATE INDEX `credit_signup_grant_claim_ip_created_idx` ON `credit_signup_grant_claim` (`ip_hash`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_signup_grant_claim_user_agent_created_idx` ON `credit_signup_grant_claim` (`user_agent_hash`,`status`,`created_at`);