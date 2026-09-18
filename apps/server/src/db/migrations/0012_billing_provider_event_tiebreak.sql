ALTER TABLE `billing_subscription` ADD `provider_event_id` text;
--> statement-breakpoint
ALTER TABLE `billing_purchase` ADD `provider_event_id` text;
