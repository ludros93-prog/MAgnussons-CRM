CREATE TABLE `crm_files` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`object_key` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`space`,`customer_id`) REFERENCES `crm_customers`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_files_object_key_unique` ON `crm_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_files_customer` ON `crm_files` (`space`,`customer_id`);--> statement-breakpoint
CREATE TABLE `crm_members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_members_email_unique` ON `crm_members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_members_user_id_unique` ON `crm_members` (`user_id`);