ALTER TABLE `stages` ADD `type` text;--> statement-breakpoint
ALTER TABLE `stages` ADD `niveau` text;--> statement-breakpoint
ALTER TABLE `stages` ADD `duree` text;--> statement-breakpoint
ALTER TABLE `stages` ADD `prix` text;--> statement-breakpoint
ALTER TABLE `stages` ADD `programme` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `stages` ADD `note` text;