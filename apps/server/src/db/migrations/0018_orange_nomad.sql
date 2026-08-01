CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_storage_key_idx` ON `asset` (`storage_key`);--> statement-breakpoint
CREATE INDEX `asset_owner_created_at_idx` ON `asset` (`owner_id`,`created_at`);--> statement-breakpoint
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
CREATE INDEX `admin_audit_log_actor_created_at_idx` ON `admin_audit_log` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `failed_job_event` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_message_id` text NOT NULL,
	`job_id` text NOT NULL,
	`job_type` text NOT NULL,
	`payload` text NOT NULL,
	`error` text NOT NULL,
	`attempts` integer NOT NULL,
	`failed_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	`resolution` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `failed_job_event_queue_message_id_idx` ON `failed_job_event` (`queue_message_id`);--> statement-breakpoint
CREATE INDEX `failed_job_event_unresolved_failed_at_idx` ON `failed_job_event` (`resolved_at`,`failed_at`);--> statement-breakpoint
CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`type` text NOT NULL,
	`owner_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
	`payload_hash` text NOT NULL,
	`result` text,
	`error` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`run_after` integer NOT NULL,
	`locked_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_idempotency_key_idx` ON `job` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `job_status_run_after_idx` ON `job` (`status`,`run_after`);--> statement-breakpoint
CREATE INDEX `job_owner_created_at_idx` ON `job` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `job_event` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`type` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_event_job_created_at_idx` ON `job_event` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `job_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_outbox_job_id_idx` ON `job_outbox` (`job_id`);--> statement-breakpoint
CREATE INDEX `job_outbox_status_created_at_idx` ON `job_outbox` (`status`,`created_at`);