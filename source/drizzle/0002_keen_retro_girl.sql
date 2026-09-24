ALTER TABLE `taste_observation` ADD `category` text DEFAULT '기타' NOT NULL;--> statement-breakpoint
ALTER TABLE `taste_observation` ADD `publication_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `observation_publication_unique` ON `taste_observation` (`publication_key`);