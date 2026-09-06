CREATE TABLE `temoignages` (
	`id` text PRIMARY KEY NOT NULL,
	`transmetteur_id` text NOT NULL,
	`texte` text NOT NULL,
	`auteur` text NOT NULL,
	`contexte` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transmetteur_id`) REFERENCES `transmetteurs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `temoignages_transmetteur_idx` ON `temoignages` (`transmetteur_id`);--> statement-breakpoint
ALTER TABLE `transmetteurs` ADD `nom_lieu` text;--> statement-breakpoint
ALTER TABLE `transmetteurs` ADD `metier` text;