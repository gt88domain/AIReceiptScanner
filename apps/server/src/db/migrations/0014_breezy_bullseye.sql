ALTER TABLE `job` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `job` ADD `payload_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `job_idempotency_key_idx` ON `job` (`idempotency_key`);
