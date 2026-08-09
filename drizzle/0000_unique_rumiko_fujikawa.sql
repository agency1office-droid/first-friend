CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`household` text NOT NULL,
	`care_plan` text NOT NULL,
	`readiness_score` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_favorites_member_animal` ON `favorites` (`member_id`,`animal_id`);--> statement-breakpoint
CREATE TABLE `lost_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`species` text NOT NULL,
	`region` text NOT NULL,
	`occurred_at` text NOT NULL,
	`description` text NOT NULL,
	`image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`image_key` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_unique_member_target` ON `reports` (`member_id`,`target_type`,`target_id`);