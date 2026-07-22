ALTER TABLE `billing_event` ADD `lease_until` integer;
--> statement-breakpoint
ALTER TABLE `billing_event` ADD `next_retry_at` integer;
