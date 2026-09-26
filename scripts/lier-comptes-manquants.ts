// Rattrape les fiches importées avant que la création de fiche ne crée aussi
// le compte du transmetteur : chaque fiche doit avoir le sien.
//
//   npm run comptes:lier
//
// Aucun email n'est envoyé : les comptes créés n'ont pas de mot de passe et
// restent muets tant que l'association n'a pas envoyé l'invitation depuis la
// fiche.
import { eq, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { transmetteurs, users } from "../lib/db/schema";

async function main() {
  const orphelines = await db.query.transmetteurs.findMany({
    where: isNull(transmetteurs.userId),
  });

  if (orphelines.length === 0) {
    console.log("Toutes les fiches ont déjà un compte.");
    return;
  }

  for (const fiche of orphelines) {
    // Une adresse déjà connue garde son compte : on se contente de rattacher.
    let user = await db.query.users.findFirst({
      where: eq(users.email, fiche.email),
    });
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email: fiche.email, role: "transmetteur" })
        .returning();
    }

    await db
      .update(transmetteurs)
      .set({ userId: user.id })
      .where(eq(transmetteurs.id, fiche.id));

    console.log(`${fiche.nom} → ${fiche.email}`);
  }

  console.log(`${orphelines.length} fiche(s) rattachée(s).`);
}

main();
