CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`transmetteur_id` text NOT NULL,
	`date_debut` integer NOT NULL,
	`date_fin` integer NOT NULL,
	`titre` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`places_disponibles` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`transmetteur_id`) REFERENCES `transmetteurs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stages_transmetteur_idx` ON `stages` (`transmetteur_id`);--> statement-breakpoint
CREATE TABLE `transmetteur_types` (
	`transmetteur_id` text NOT NULL,
	`type_id` integer NOT NULL,
	PRIMARY KEY(`transmetteur_id`, `type_id`),
	FOREIGN KEY (`transmetteur_id`) REFERENCES `transmetteurs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `types_transmission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transmetteurs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`nom` text NOT NULL,
	`slug` text NOT NULL,
	`histoire` text DEFAULT '' NOT NULL,
	`domaine` text NOT NULL,
	`savoir_faire` text NOT NULL,
	`photos` text NOT NULL,
	`site_web` text,
	`reseaux_sociaux` text,
	`email` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`lieu_approximatif` text NOT NULL,
	`modalites_accueil` text,
	`hebergement` integer DEFAULT false NOT NULL,
	`niveau` text DEFAULT 'tous' NOT NULL,
	`publiee` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transmetteurs_slug_unique` ON `transmetteurs` (`slug`);--> statement-breakpoint
CREATE INDEX `transmetteurs_domaine_idx` ON `transmetteurs` (`domaine`);--> statement-breakpoint
CREATE INDEX `transmetteurs_publiee_idx` ON `transmetteurs` (`publiee`);--> statement-breakpoint
CREATE TABLE `types_transmission` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `types_transmission_nom_unique` ON `types_transmission` (`nom`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`role` text DEFAULT 'transmetteur' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
