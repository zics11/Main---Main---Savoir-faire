// Définit (ou remplace) le mot de passe d'un compte existant.
//
//   npm run admin:mot-de-passe -- vous@exemple.fr
//
// Le mot de passe est saisi dans le terminal, sans s'afficher : il ne passe
// jamais par un argument de commande (visible dans l'historique du shell).
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE } from "../lib/password";
import { demanderMotDePasse } from "./saisie-masquee";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage : npm run admin:mot-de-passe -- vous@exemple.fr");
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.error("À lancer dans un terminal interactif (saisie masquée).");
    process.exit(1);
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    console.error(`Aucun compte pour ${email}.`);
    process.exit(1);
  }

  const motDePasse = await demanderMotDePasse(LONGUEUR_MIN_MOT_DE_PASSE);

  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, user.id));

  console.log(`Mot de passe enregistré pour ${email} (${user.role}).`);
}

main();
