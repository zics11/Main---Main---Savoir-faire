"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { appliquerReinitialisation, compteDuJetonReinit } from "@/lib/activation";
import { signIn } from "@/lib/auth";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";
import { hacherMotDePasse } from "@/lib/password";

export type ReinitState = { erreur: string } | null;

/**
 * Nouveau mot de passe choisi depuis le lien de récupération. Le jeton est
 * revérifié ici : la page qui l'affiche ne prouve rien.
 */
export async function definirNouveauMotDePasse(
  jeton: string,
  _prev: ReinitState,
  formData: FormData
): Promise<ReinitState> {
  const compte = await compteDuJetonReinit(jeton);
  if (!compte) {
    return {
      erreur:
        "Ce lien n'est plus valable. Demandez-en un nouveau depuis « Mot de passe oublié ».",
    };
  }

  const motDePasse = String(formData.get("password") ?? "");
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return { erreur: `Trop court : ${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.` };
  }
  if (motDePasse !== String(formData.get("confirmation") ?? "")) {
    return { erreur: "Les deux saisies ne correspondent pas." };
  }

  // Le clic sur le lien vaut preuve : le mot de passe s'applique tout de
  // suite, sans confirmation supplémentaire.
  await appliquerReinitialisation(compte.id, await hacherMotDePasse(motDePasse));

  try {
    await signIn("credentials", {
      email: compte.email,
      password: motDePasse,
      redirectTo: "/apres-connexion",
    });
  } catch (e) {
    // signIn redirige en levant une erreur : elle doit remonter.
    if (e instanceof AuthError) redirect("/connexion");
    throw e;
  }
  return null;
}
