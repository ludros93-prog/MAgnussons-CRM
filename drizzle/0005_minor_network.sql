ALTER TABLE `crm_mutations` ADD `result_json` text;--> statement-breakpoint
ALTER TABLE `crm_mutations` ADD `user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_mutations` ADD `request_hash` text DEFAULT '' NOT NULL;