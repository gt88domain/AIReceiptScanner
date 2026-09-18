ALTER TABLE `billing_event` ADD `processing_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- Existing rows predate the status machine. Mark them processed so providers
-- don't retry events that were already handled under the old flow.
UPDATE `billing_event` SET `processing_status` = 'processed';
