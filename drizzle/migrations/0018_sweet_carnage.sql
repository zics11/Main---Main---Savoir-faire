ALTER TABLE `users` ADD `mot_de_passe_en_attente` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mot_de_passe_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mot_de_passe_token_expires` integer;