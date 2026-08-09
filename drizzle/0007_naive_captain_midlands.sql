CREATE TABLE `auth_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_auth_accounts_provider_user` ON `auth_accounts` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_accounts_email` ON `auth_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_auth_sessions_token` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_member_expires` ON `auth_sessions` (`member_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `applications` ADD `shelter_public_id` text;