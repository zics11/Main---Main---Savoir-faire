// Crée un compte d'administration, ou passe un compte existant en admin.
//
//   npm run admin:creer -- vous@exemple.fr
//
// Il n'y a pas d'équivalent dans l'interface : les comptes créés depuis le
// site sont toujours des transmetteurs.
import { creerOuPromouvoirAdmin } from "../lib/comptes-admin";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "../lib/password";
import { demanderMotDePasse } from "./saisie-masquee";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email?.includes("@")) {
    console.error("Usage : npm run admin:creer -- vous@exemple.fr");
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.error("À lancer dans un terminal interactif (saisie masquée).");
    process.exit(1);
  }

  const motDePasse = await demanderMotDePasse(LONGUEUR_MIN_MOT_DE_PASSE);
  const resultat = await creerOuPromouvoirAdmin(email, motDePasse);

  if (resultat.etat === "deja-admin") {
    console.log(`${email} est déjà administrateur.`);
    console.log(`Pour changer son mot de passe : npm run admin:mot-de-passe -- ${email}`);
    return;
  }
  console.log(
    resultat.etat === "cree"
      ? `Compte administrateur créé pour ${email}.`
      : `${email} (${resultat.ancienRole}) est désormais administrateur.`
  );
  console.log(
    "Connexion sur /connexion ; la double authentification s'active depuis « Mon compte »."
  );
}

main();
