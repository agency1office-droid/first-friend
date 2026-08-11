CREATE TABLE `shelter_follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shelter_public_id` text NOT NULL,
	`member_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shelter_follow_unique` ON `shelter_follows` (`shelter_public_id`,`member_id`);--> statement-breakpoint
CREATE INDEX `idx_shelter_follow_member` ON `shelter_follows` (`member_id`);