CREATE TABLE `demandes_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`transmetteur_id` text NOT NULL,
	`stage_id` text,
	`email_empreinte` text NOT NULL,
	`confirmee` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transmetteur_id`) REFERENCES `transmetteurs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `demandes_contact_transmetteur_idx` ON `demandes_contact` (`transmetteur_id`);--> statement-breakpoint
CREATE INDEX `demandes_contact_email_idx` ON `demandes_contact` (`email_empreinte`,`created_at`);