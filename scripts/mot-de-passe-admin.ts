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

const CTRL_C = String.fromCharCode(3);
const RETOUR_ARRIERE = [String.fromCharCode(127), String.fromCharCode(8)];

function saisieMasquee(question: string) {
  return new Promise<string>((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let valeur = "";
    const surTouche = (touches: string) => {
      for (const c of touches) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", surTouche);
          process.stdout.write("\n");
          return resolve(valeur);
        }
        if (c === CTRL_C) {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(1);
        }
        if (RETOUR_ARRIERE.includes(c)) valeur = valeur.slice(0, -1);
        else valeur += c;
      }
    };
    stdin.on("data", surTouche);
  });
}

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

  const motDePasse = await saisieMasquee("Nouveau mot de passe : ");
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    console.error(`Trop court : ${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.`);
    process.exit(1);
  }
  if ((await saisieMasquee("Confirmez : ")) !== motDePasse) {
    console.error("Les deux saisies ne correspondent pas.");
    process.exit(1);
  }

  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, user.id));

  console.log(`Mot de passe enregistré pour ${email} (${user.role}).`);
}

main();
