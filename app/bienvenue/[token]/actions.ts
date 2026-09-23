"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { compteDuJeton, consommerJeton } from "@/lib/activation";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";
import { hacherMotDePasse } from "@/lib/password";

export type AccueilState = { erreur: string } | null;

/**
 * Premier mot de passe, choisi par le transmetteur depuis son lien d'accueil.
 * Le jeton est revérifié ici : la page qui l'affiche ne prouve rien.
 */
export async function definirPremierMotDePasse(
  jeton: string,
  _prev: AccueilState,
  formData: FormData
): Promise<AccueilState> {
  const compte = await compteDuJeton(jeton);
  if (!compte) {
    return {
      erreur:
        "Ce lien n'est plus valable. Demandez à l'association de vous en renvoyer un.",
    };
  }

  const motDePasse = String(formData.get("password") ?? "");
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return {
      erreur: `Trop court : ${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.`,
    };
  }
  if (motDePasse !== String(formData.get("confirmation") ?? "")) {
    return { erreur: "Les deux saisies ne correspondent pas." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, compte.id));
  // Le lien ne doit plus rien ouvrir une fois le mot de passe choisi.
  await consommerJeton(compte.id);

  try {
    // Connexion directe : il arrive sur son espace sans ressaisir ce qu'il
    // vient de taper.
    await signIn("credentials", {
      email: compte.email,
      password: motDePasse,
      redirectTo: "/mes-stages?bienvenue=1",
    });
  } catch (e) {
    // signIn redirige en levant une erreur : elle doit remonter.
    if (e instanceof AuthError) redirect("/connexion");
    throw e;
  }
  return null;
}
