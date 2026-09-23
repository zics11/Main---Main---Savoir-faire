PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transmetteurs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`nom` text NOT NULL,
	`nom_lieu` text,
	`metier` text,
	`slug` text NOT NULL,
	`histoire` text DEFAULT '' NOT NULL,
	`domaine` text NOT NULL,
	`savoir_faire` text,
	`photos` text NOT NULL,
	`photo_portrait` text,
	`site_web` text,
	`reseaux_sociaux` text,
	`email` text NOT NULL,
	`lat` real,
	`lng` real,
	`lieu_approximatif` text,
	`modalites_accueil` text,
	`hebergement` integer DEFAULT false NOT NULL,
	`repas` integer DEFAULT false NOT NULL,
	`type_repas` text,
	`publiee` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_transmetteurs`("id", "user_id", "nom", "nom_lieu", "metier", "slug", "histoire", "domaine", "savoir_faire", "photos", "photo_portrait", "site_web", "reseaux_sociaux", "email", "lat", "lng", "lieu_approximatif", "modalites_accueil", "hebergement", "repas", "type_repas", "publiee", "created_at", "updated_at") SELECT "id", "user_id", "nom", "nom_lieu", "metier", "slug", "histoire", "domaine", "savoir_faire", "photos", "photo_portrait", "site_web", "reseaux_sociaux", "email", "lat", "lng", "lieu_approximatif", "modalites_accueil", "hebergement", "repas", "type_repas", "publiee", "created_at", "updated_at" FROM `transmetteurs`;--> statement-breakpoint
DROP TABLE `transmetteurs`;--> statement-breakpoint
ALTER TABLE `__new_transmetteurs` RENAME TO `transmetteurs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transmetteurs_slug_unique` ON `transmetteurs` (`slug`);--> statement-breakpoint
CREATE INDEX `transmetteurs_domaine_idx` ON `transmetteurs` (`domaine`);--> statement-breakpoint
CREATE INDEX `transmetteurs_publiee_idx` ON `transmetteurs` (`publiee`);