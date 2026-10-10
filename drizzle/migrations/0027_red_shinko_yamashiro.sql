CREATE TABLE `demandes_temoignage` (
	`id` text PRIMARY KEY NOT NULL,
	`transmetteur_id` text NOT NULL,
	`stage_id` text,
	`nom` text NOT NULL,
	`email` text NOT NULL,
	`jeton` text NOT NULL,
	`expire_le` integer NOT NULL,
	`envoyee_le` integer NOT NULL,
	`reponse` text,
	`repondu_le` integer,
	`temoignage_id` text,
	FOREIGN KEY (`transmetteur_id`) REFERENCES `transmetteurs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`temoignage_id`) REFERENCES `temoignages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demandes_temoignage_fiche_email_idx` ON `demandes_temoignage` (`transmetteur_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `demandes_temoignage_jeton_idx` ON `demandes_temoignage` (`jeton`);