CREATE TABLE `crm_drafts` (
	`space` text NOT NULL,
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`request_id` text NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`space`, `user_id`, `id`)
);
