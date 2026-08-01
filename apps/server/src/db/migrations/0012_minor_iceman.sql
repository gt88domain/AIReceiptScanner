CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before` text,
	`after` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_log_entity_created_at_idx` ON `admin_audit_log` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_actor_created_at_idx` ON `admin_audit_log` (`actor_id`,`created_at`);