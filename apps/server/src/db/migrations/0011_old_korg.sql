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
CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`owner_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
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
