ALTER TABLE `failed_job_event` ADD `resolution_token` text;--> statement-breakpoint
ALTER TABLE `job` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `job` ADD `lease_until` integer;--> statement-breakpoint
CREATE INDEX `job_status_lease_until_idx` ON `job` (`status`,`lease_until`);--> statement-breakpoint
ALTER TABLE `job_outbox` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `job_outbox` ADD `lease_until` integer;--> statement-breakpoint
CREATE INDEX `job_outbox_status_lease_until_created_at_idx` ON `job_outbox` (`status`,`lease_until`,`created_at`);--> statement-breakpoint
ALTER TABLE `billing_event` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `alert_lease_token` text;--> statement-breakpoint
ALTER TABLE `billing_event` ADD `alert_lease_until` integer;--> statement-breakpoint
CREATE INDEX `billing_event_alert_lease_idx` ON `billing_event` (`alerted_at`,`alert_lease_until`);--> statement-breakpoint
ALTER TABLE `billing_outbox` ADD `lease_token` text;