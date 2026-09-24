CREATE TABLE `taste_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`event` text NOT NULL,
	`target` text NOT NULL,
	`day` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_unique` ON `taste_events` (`session`,`event`,`target`,`day`);--> statement-breakpoint
CREATE TABLE `menu_media` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`session` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`rights` integer NOT NULL,
	`moderation` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `taste_observation` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`role` text NOT NULL,
	`place_id` text,
	`menu_id` text,
	`shop` text NOT NULL,
	`menu` text NOT NULL,
	`address` text NOT NULL,
	`price` integer NOT NULL,
	`heat` integer NOT NULL,
	`flavor` text NOT NULL,
	`observed_at` text NOT NULL,
	`note` text NOT NULL,
	`lat` text,
	`lng` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `observation_session` ON `taste_observation` (`session`);--> statement-breakpoint
CREATE TABLE `menu_saves` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`menu_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `save_session_menu` ON `menu_saves` (`session`,`menu_id`);