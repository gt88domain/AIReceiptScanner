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
CREATE INDEX `failed_job_event_unresolved_failed_at_idx` ON `failed_job_event` (`resolved_at`,`failed_at`);