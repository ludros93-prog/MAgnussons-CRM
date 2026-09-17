CREATE TABLE `outlook_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`microsoft_id` text NOT NULL,
	`email` text NOT NULL,
	`tokens` text NOT NULL,
	`last_sync` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`sync_note` text DEFAULT '' NOT NULL,
	`lock_until` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outlook_connections_microsoft_id_unique` ON `outlook_connections` (`microsoft_id`);--> statement-breakpoint
CREATE TABLE `outlook_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`deal_id` text DEFAULT '' NOT NULL,
	`shared` integer DEFAULT 0 NOT NULL,
	`happened_at` text NOT NULL,
	`seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_outlook_user` ON `outlook_items` (`user_id`,`happened_at`);--> statement-breakpoint
CREATE INDEX `idx_outlook_shared_customer` ON `outlook_items` (`shared`,`customer_id`,`happened_at`);--> statement-breakpoint
CREATE TABLE `outlook_oauth_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`verifier` text NOT NULL,
	`expires` integer NOT NULL
);
