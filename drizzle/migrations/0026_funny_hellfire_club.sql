ALTER TABLE `transmetteurs` ADD `ville` text;--> statement-breakpoint
ALTER TABLE `transmetteurs` ADD `code_postal` text;--> statement-breakpoint
-- Reprise des fiches existantes : leur lieu tenait dans une seule ligne
-- (« Sablé-sur-Sarthe, Sarthe (72) »). On en extrait la commune ; ce qui suit
-- la virgule devient le complément. Le code postal, lui, n'y figurait jamais :
-- il reste à saisir. Les libellés qui n'ont qu'un département (« Bas-Rhin
-- (67) ») restent entiers dans le complément.
UPDATE `transmetteurs`
   SET `ville` = trim(substr(`lieu_approximatif`, 1, instr(`lieu_approximatif`, ',') - 1)),
       `lieu_approximatif` = trim(substr(`lieu_approximatif`, instr(`lieu_approximatif`, ',') + 1))
 WHERE `ville` IS NULL AND `lieu_approximatif` LIKE '%,%';--> statement-breakpoint
UPDATE `transmetteurs`
   SET `ville` = trim(`lieu_approximatif`), `lieu_approximatif` = NULL
 WHERE `ville` IS NULL AND `lieu_approximatif` IS NOT NULL
   AND `lieu_approximatif` NOT LIKE '%,%' AND `lieu_approximatif` NOT LIKE '%(%';
