ALTER TABLE `billing_purchase` ADD `provider_event_at` integer;
--> statement-breakpoint
ALTER TABLE `billing_subscription` ADD `provider_event_at` integer;
