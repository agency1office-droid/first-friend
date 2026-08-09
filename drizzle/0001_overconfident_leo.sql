CREATE TABLE `adoption_agreements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`version` text DEFAULT '2026-08' NOT NULL,
	`terms_json` text NOT NULL,
	`signed_name` text NOT NULL,
	`agreed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agreements_application` ON `adoption_agreements` (`application_id`);--> statement-breakpoint
CREATE TABLE `application_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_application_created` ON `application_messages` (`application_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `direct_animals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`status` text DEFAULT 'review' NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`region` text NOT NULL,
	`rescue_story` text NOT NULL,
	`health_json` text NOT NULL,
	`life_json` text NOT NULL,
	`adoption_terms` text NOT NULL,
	`image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_direct_animals_member_status` ON `direct_animals` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `handover_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`method` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`region` text NOT NULL,
	`checklist_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`adopter_confirmed` integer DEFAULT false NOT NULL,
	`guardian_confirmed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_handover_application` ON `handover_reservations` (`application_id`);--> statement-breakpoint
CREATE TABLE `post_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`reaction` text DEFAULT 'cheer' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_post_reactions_member_post` ON `post_reactions` (`member_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `readiness_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`species` text NOT NULL,
	`profile_json` text NOT NULL,
	`readiness_score` integer NOT NULL,
	`education_score` integer NOT NULL,
	`passed` integer DEFAULT false NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_readiness_member_completed` ON `readiness_assessments` (`member_id`,`completed_at`);--> statement-breakpoint
ALTER TABLE `applications` ADD `readiness_assessment_id` integer;--> statement-breakpoint
ALTER TABLE `applications` ADD `absence_plan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `emergency_plan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `agreement_accepted` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_applications_member_status` ON `applications` (`member_id`,`status`);--> statement-breakpoint
ALTER TABLE `lost_reports` ADD `ownership_question` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `lost_reports` ADD `alert_region` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `sanctioned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `foster_education_completed` integer DEFAULT false NOT NULL;
--> statement-breakpoint
PRAGMA optimize;
