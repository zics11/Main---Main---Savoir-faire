"use server";

import { revalidatePath } from "next/cache";
import {
  declinerDemande,
  deposerTemoignage,
  ErreurDemande,
} from "@/lib/demandes-temoignage";

// La réponse d'une personne invitée à témoigner. Aucun compte : c'est le
// lien reçu par email, à usage unique, qui fait foi.

export type EtatTemoignage =
  | { ok: true; slug: string; publiee: boolean }
  | { ok: false; erreur: string; valeurs: { texte: string; auteur: string } }
  | null;

export async function publierTemoignage(
  jeton: string,
  _precedent: EtatTemoignage,
  formData: FormData
): Promise<EtatTemoignage> {
  const saisie = {
    texte: String(formData.get("texte") ?? ""),
    auteur: String(formData.get("auteur") ?? ""),
  };
  try {
    const fiche = await deposerTemoignage(jeton, saisie);
    revalidatePath(`/fiche/${fiche.slug}`);
    revalidatePath("/mes-stages");
    revalidatePath(`/admin/fiches/${fiche.id}`);
    return { ok: true, slug: fiche.slug, publiee: fiche.publiee };
  } catch (e) {
    if (e instanceof ErreurDemande) {
      return { ok: false, erreur: e.message, valeurs: saisie };
    }
    throw e;
  }
}

export async function refuserDemande(jeton: string) {
  await declinerDemande(jeton);
  revalidatePath("/mes-stages");
}
