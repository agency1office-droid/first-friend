CREATE TABLE `account_sanctions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`fingerprint_hash` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_account_sanctions_member_status` ON `account_sanctions` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`before_json` text DEFAULT '{}' NOT NULL,
	`after_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_target_created` ON `admin_audit_logs` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `animal_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`animal_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`object_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `direct_animals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_animal_media_animal_order` ON `animal_media` (`animal_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `family_opinions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`author_name` text NOT NULL,
	`decision` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `family_rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_family_opinions_room_created` ON `family_opinions` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `family_rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`share_token` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'discussing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_family_rooms_token` ON `family_rooms` (`share_token`);--> statement-breakpoint
CREATE INDEX `idx_family_rooms_owner` ON `family_rooms` (`owner_id`);--> statement-breakpoint
CREATE TABLE `lost_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lost_report_id` integer NOT NULL,
	`found_report_id` integer NOT NULL,
	`score` integer NOT NULL,
	`reasons_json` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lost_report_id`) REFERENCES `lost_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`found_report_id`) REFERENCES `lost_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lost_matches_pair` ON `lost_matches` (`lost_report_id`,`found_report_id`);--> statement-breakpoint
CREATE TABLE `lost_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `lost_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lost_messages_report_created` ON `lost_messages` (`report_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lost_timeline_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`region` text NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `lost_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lost_timeline_report_occurred` ON `lost_timeline_events` (`report_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `shelter_needs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shelter_id` integer NOT NULL,
	`item_name` text NOT NULL,
	`target_quantity` integer NOT NULL,
	`received_quantity` integer DEFAULT 0 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'needed' NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelter_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shelter_needs_shelter_status` ON `shelter_needs` (`shelter_id`,`status`);--> statement-breakpoint
CREATE TABLE `shelter_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`region` text NOT NULL,
	`introduction` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shelter_profiles_public_id` ON `shelter_profiles` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_shelter_profiles_region` ON `shelter_profiles` (`region`);--> statement-breakpoint
CREATE TABLE `shelter_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shelter_id` integer NOT NULL,
	`author_id` text,
	`category` text DEFAULT 'daily' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`image_key` text,
	`hidden` integer DEFAULT false NOT NULL,
	`reactions` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelter_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shelter_updates_shelter_created` ON `shelter_updates` (`shelter_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `support_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'intent' NOT NULL,
	`disclosure` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_support_records_member_created` ON `support_records` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `volunteer_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `volunteer_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_volunteer_application_unique` ON `volunteer_applications` (`post_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `volunteer_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shelter_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`region` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelter_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_volunteer_posts_shelter_status` ON `volunteer_posts` (`shelter_id`,`status`);--> statement-breakpoint
ALTER TABLE `applications` ADD `suitability_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `suitability_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `lost_reports` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `lost_reports` ADD `visual_tags_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `home_region` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `shares` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
PRAGMA optimize;
