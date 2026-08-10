CREATE TABLE `animal_name_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`animal_id` text NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`votes` integer DEFAULT 0 NOT NULL,
	`selected` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_animal_name_member_name` ON `animal_name_suggestions` (`animal_id`,`member_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_animal_name_votes` ON `animal_name_suggestions` (`animal_id`,`votes`);--> statement-breakpoint
CREATE TABLE `animal_name_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`suggestion_id` integer NOT NULL,
	`member_id` text NOT NULL,
	FOREIGN KEY (`suggestion_id`) REFERENCES `animal_name_suggestions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_animal_name_vote_unique` ON `animal_name_votes` (`suggestion_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `community_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`body` text NOT NULL,
	`helpful` integer DEFAULT 0 NOT NULL,
	`accepted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_answers_question_helpful` ON `community_answers` (`question_id`,`helpful`);--> statement-breakpoint
CREATE TABLE `community_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_questions_status_created` ON `community_questions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `drawing_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`reason` text NOT NULL,
	`selected` integer DEFAULT false NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `drawing_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_drawing_match_unique` ON `drawing_matches` (`post_id`,`member_id`,`animal_id`);--> statement-breakpoint
CREATE TABLE `drawing_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`image_key` text NOT NULL,
	`species` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_drawing_posts_status_created` ON `drawing_posts` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `fundraiser_pledges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fundraiser_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pledged' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`fundraiser_id`) REFERENCES `fundraisers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fundraiser_pledges_campaign` ON `fundraiser_pledges` (`fundraiser_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `fundraisers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shelter_id` integer NOT NULL,
	`animal_id` text NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`target_amount` integer NOT NULL,
	`raised_amount` integer DEFAULT 0 NOT NULL,
	`evidence_key` text,
	`status` text DEFAULT 'review' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelter_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fundraisers_status_created` ON `fundraisers` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `volunteer_badges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`awarded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_volunteer_badge_unique` ON `volunteer_badges` (`member_id`,`kind`);--> statement-breakpoint
ALTER TABLE `applications` ADD `adopter_age` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `volunteer_posts` ADD `category` text DEFAULT 'care' NOT NULL;