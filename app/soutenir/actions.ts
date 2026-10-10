"use server";

import { redirect } from "next/navigation";
import { enEuros, estSource, MONTANT_MAX, MONTANT_MIN } from "@/lib/dons";
import { donsVisibles, fournisseurDon } from "@/lib/dons-serveur";

export type EtatDon = { apercu: string } | { erreur: string } | null;

/**
 * Le bouton « Donner » : le don voulu part chez le moyen de paiement. Tant
 * qu'aucun n'est branché, l'aperçu dit ce qui se passerait.
 */
export async function demarrerDon(
  _precedent: EtatDon,
  formData: FormData,
): Promise<EtatDon> {
  if (!donsVisibles()) return { erreur: "Les dons ne sont pas ouverts." };

  const montant = Number(formData.get("montant"));
  if (
    !Number.isInteger(montant) ||
    montant < MONTANT_MIN ||
    montant > MONTANT_MAX
  ) {
    return {
      erreur: `Choisissez un montant en euros, sans centimes, entre ${enEuros(MONTANT_MIN)} et ${enEuros(MONTANT_MAX)}.`,
    };
  }
  const mensuel = formData.get("frequence") === "mensuel";
  const brute = formData.get("source");
  const source = estSource(brute) ? brute : "page";

  const fournisseur = fournisseurDon();
  if (!fournisseur) {
    return {
      apercu: `Aperçu : ici, le donateur partirait payer ${enEuros(montant)}${mensuel ? " par mois" : ""}, venu de « ${source} ». Aucun moyen de paiement n'est encore branché : rien n'a été débité.`,
    };
  }
  const url = await fournisseur.demarrer({
    montant,
    mensuel,
    source,
    retour: new URL(
      "/soutenir/merci",
      process.env.AUTH_URL ?? "http://localhost:3000",
    ).toString(),
  });
  redirect(url);
}
