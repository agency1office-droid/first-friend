CREATE TABLE `adoption_certifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`application_id` integer,
	`source` text NOT NULL,
	`shelter_name` text DEFAULT '' NOT NULL,
	`animal_name` text DEFAULT '' NOT NULL,
	`verification_code_hash` text DEFAULT '' NOT NULL,
	`evidence_key` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`reviewed_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_adoption_certifications_member_status` ON `adoption_certifications` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `sanction_appeals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sanction_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`reason` text NOT NULL,
	`evidence_key` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`reviewed_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sanction_id`) REFERENCES `account_sanctions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sanction_appeals_status_created` ON `sanction_appeals` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `shelter_update_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`update_id` integer NOT NULL,
	`member_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`update_id`) REFERENCES `shelter_updates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shelter_update_reaction_unique` ON `shelter_update_reactions` (`update_id`,`member_id`);--> statement-breakpoint
ALTER TABLE `direct_animals` ADD `reconfirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;