import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hacherMotDePasse } from "@/lib/password";

// Création d'un compte d'administration. Volontairement hors du site : donner
// les droits d'administration est un geste délibéré, fait sur le serveur.
// Séparé de la saisie au clavier pour rester vérifiable.

export type ResultatAdmin =
  | { etat: "cree" }
  | { etat: "promu"; ancienRole: string }
  | { etat: "deja-admin" };

export async function creerOuPromouvoirAdmin(
  email: string,
  motDePasse: string
): Promise<ResultatAdmin> {
  const adresse = email.trim().toLowerCase();
  const existant = await db.query.users.findFirst({
    where: eq(users.email, adresse),
  });

  if (existant?.role === "admin") return { etat: "deja-admin" };

  const passwordHash = await hacherMotDePasse(motDePasse);
  if (existant) {
    await db
      .update(users)
      .set({ role: "admin", passwordHash })
      .where(eq(users.id, existant.id));
    return { etat: "promu", ancienRole: existant.role };
  }

  await db.insert(users).values({ email: adresse, role: "admin", passwordHash });
  return { etat: "cree" };
}
