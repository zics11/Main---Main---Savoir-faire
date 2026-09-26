ALTER TABLE `users` ADD `email_en_attente` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_token_expires` integer;