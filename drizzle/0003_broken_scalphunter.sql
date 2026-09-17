CREATE TABLE `crm_articles` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_company_events` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_leads` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crm_notices` (
	`id` text NOT NULL,
	`space` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`space`, `id`),
	FOREIGN KEY (`space`) REFERENCES `crm_spaces`(`id`) ON UPDATE no action ON DELETE no action
);
