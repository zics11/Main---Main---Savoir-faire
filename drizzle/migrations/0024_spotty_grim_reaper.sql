ALTER TABLE `users` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_active_le` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_codes_secours` text DEFAULT '[]' NOT NULL;