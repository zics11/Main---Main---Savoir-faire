import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hacherMotDePasse, verifierMotDePasse } from "@/lib/password";
import { genererCodesDeSecours } from "@/lib/totp";

// Les codes de secours remplacent le code de l'application quand le
// téléphone est perdu. Ils sont stockés hachés, comme des mots de passe, et
// chacun ne sert qu'une fois.

export async function enregistrerCodesDeSecours(userId: string) {
  const codes = genererCodesDeSecours();
  await db
    .update(users)
    .set({
      totpCodesSecours: await Promise.all(codes.map((c) => hacherMotDePasse(c))),
    })
    .where(eq(users.id, userId));
  // Rendus en clair une seule fois, à l'écran : ils ne sont plus relisibles.
  return codes;
}

/** Consomme un code de secours s'il correspond. Renvoie false sinon. */
export async function consommerCodeDeSecours(userId: string, saisie: string) {
  const code = saisie.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { totpCodesSecours: true },
  });
  if (!user?.totpCodesSecours.length) return false;

  for (const empreinte of user.totpCodesSecours) {
    if (await verifierMotDePasse(code, empreinte)) {
      await db
        .update(users)
        .set({
          totpCodesSecours: user.totpCodesSecours.filter((e) => e !== empreinte),
        })
        .where(eq(users.id, userId));
      return true;
    }
  }
  return false;
}
