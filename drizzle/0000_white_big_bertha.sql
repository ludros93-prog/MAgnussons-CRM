CREATE TABLE `crm_customers` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_deals` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`,`customer_id`) REFERENCES `crm_customers`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_deals_customer` ON `crm_deals` (`space`,`customer_id`);--> statement-breakpoint
CREATE TABLE `crm_events` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`,`customer_id`) REFERENCES `crm_customers`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_meetings` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`,`customer_id`) REFERENCES `crm_customers`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_mutations` (
	`space` text NOT NULL,
	`id` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_orders` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`deal_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`,`deal_id`) REFERENCES `crm_deals`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `crm_orders` (`space`,`customer_id`);--> statement-breakpoint
CREATE TABLE `crm_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`write_token` text DEFAULT '' NOT NULL,
	`settings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`customer_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`,`customer_id`) REFERENCES `crm_customers`(`space`,`id`) ON UPDATE no action ON DELETE no action
);
