ALTER TABLE `public_animals` ADD `up_kind_cd` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `public_animals` ADD `kind_cd` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_public_animals_kind_active` ON `public_animals` (`up_kind_cd`,`kind_cd`,`active`);