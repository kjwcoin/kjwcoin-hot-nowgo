CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contribution_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_id` text NOT NULL,
	`points` integer NOT NULL,
	`verified_by` text NOT NULL,
	`verified_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_source_unique` ON `contribution_ledger` (`source_kind`,`source_id`);--> statement-breakpoint
CREATE INDEX `contribution_owner` ON `contribution_ledger` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_credentials` (
	`customer_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customer_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`channel` text NOT NULL,
	`scope` text DEFAULT 'nowgo' NOT NULL,
	`granted` integer NOT NULL,
	`version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `consent_owner_channel_time` ON `customer_consents` (`customer_id`,`channel`,`created_at`);--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_session_owner` ON `customer_sessions` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_store_links` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`place_id` text NOT NULL,
	`status` text DEFAULT 'following' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_store_unique` ON `customer_store_links` (`customer_id`,`place_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`phone_e164` text NOT NULL,
	`phone_verified_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_phone_unique` ON `customers` (`phone_e164`);--> statement-breakpoint
CREATE TABLE `menu_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`menu_id` text NOT NULL,
	`body` text NOT NULL,
	`heat` integer NOT NULL,
	`visit_verified_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_owner_menu` ON `menu_reviews` (`customer_id`,`menu_id`);