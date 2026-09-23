"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/password";

export type CompteState = { ok: boolean; message: string } | null;

/**
 * Définit ou remplace le mot de passe du compte connecté.
 *
 * L'ancien mot de passe n'est pas demandé : la session en cours fait foi.
 */
export async function definirMotDePasse(
  _prev: CompteState,
  formData: FormData
): Promise<CompteState> {
  const user = await requireUser();
  const motDePasse = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return {
      ok: false,
      message: `Trop court : ${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.`,
    };
  }
  if (motDePasse !== confirmation) {
    return { ok: false, message: "Les deux saisies ne correspondent pas." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, user.id));

  revalidatePath("/mon-compte");
  return {
    ok: true,
    message: "Mot de passe enregistré. Il sert dès la prochaine connexion.",
  };
}
