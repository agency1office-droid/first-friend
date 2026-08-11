CREATE TABLE `public_animals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text NOT NULL,
	`age` text NOT NULL,
	`age_group` text NOT NULL,
	`sex` text NOT NULL,
	`region` text NOT NULL,
	`shelter_id` text,
	`shelter_name` text NOT NULL,
	`shelter_address` text DEFAULT '' NOT NULL,
	`shelter_phone` text DEFAULT '' NOT NULL,
	`shelter_lat` real,
	`shelter_lng` real,
	`approximate_shelter_location` integer DEFAULT false NOT NULL,
	`updated` text NOT NULL,
	`image_1` text NOT NULL,
	`image_2` text DEFAULT '' NOT NULL,
	`colors_json` text DEFAULT '[]' NOT NULL,
	`traits_json` text DEFAULT '[]' NOT NULL,
	`summary` text NOT NULL,
	`health_json` text DEFAULT '[]' NOT NULL,
	`life_json` text DEFAULT '[]' NOT NULL,
	`match_reason` text NOT NULL,
	`process_state` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_seen_sync` text NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_public_animals_active_updated` ON `public_animals` (`active`,`updated`);--> statement-breakpoint
CREATE INDEX `idx_public_animals_species_active` ON `public_animals` (`species`,`active`);--> statement-breakpoint
CREATE INDEX `idx_public_animals_shelter` ON `public_animals` (`shelter_id`);--> statement-breakpoint
CREATE TABLE `public_shelters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`hours` text DEFAULT '' NOT NULL,
	`closed` text DEFAULT '' NOT NULL,
	`lat` real,
	`lng` real,
	`approximate_location` integer DEFAULT false NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_public_shelters_name` ON `public_shelters` (`name`);--> statement-breakpoint
CREATE TABLE `public_sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`last_started_at` text NOT NULL,
	`last_completed_at` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`message` text DEFAULT '' NOT NULL
);
