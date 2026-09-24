CREATE TABLE `unified_auth_requests` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unified_auth_expiry` ON `unified_auth_requests` (`expires_at`);--> statement-breakpoint
CREATE TABLE `unified_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`access_token` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unified_session_expiry` ON `unified_sessions` (`expires_at`);