CREATE TABLE `stage_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`date_debut` integer NOT NULL,
	`date_fin` integer NOT NULL,
	`places` integer,
	`inscrits` integer DEFAULT 0 NOT NULL,
	`publiee` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stage_dates_stage_idx` ON `stage_dates` (`stage_id`);--> statement-breakpoint
ALTER TABLE `stages` DROP COLUMN `date_debut`;--> statement-breakpoint
ALTER TABLE `stages` DROP COLUMN `date_fin`;--> statement-breakpoint
ALTER TABLE `stages` DROP COLUMN `places`;--> statement-breakpoint
ALTER TABLE `stages` DROP COLUMN `inscrits`;