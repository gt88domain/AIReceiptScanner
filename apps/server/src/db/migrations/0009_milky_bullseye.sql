ALTER TABLE `billing_event` ADD `first_received_at` integer;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `last_attempt_at` integer;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `attempt_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `last_error` text;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `alerted_at` integer;--> statement-breakpoint
CREATE INDEX `billing_event_pending_alert_idx` ON `billing_event` (`processing_status`,`alerted_at`,`first_received_at`);