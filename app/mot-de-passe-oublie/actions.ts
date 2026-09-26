"use server";

import { envoyerLienReinitialisation } from "@/lib/reinitialisation";

export type OubliState = { ok: boolean; message: string } | null;

export async function demanderReinitialisation(
  _prev: OubliState,
  formData: FormData
): Promise<OubliState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, message: "Entrez une adresse email valide." };
  }

  const envoye = await envoyerLienReinitialisation(email);
  if (!envoye) {
    return {
      ok: false,
      message: "L'email n'a pas pu partir. Réessayez dans un moment.",
    };
  }

  // Même réponse que l'adresse existe ou non : la page ne doit pas servir à
  // deviner qui a un compte.
  return {
    ok: true,
    message:
      "Si un compte utilise cette adresse, un lien vient de lui être envoyé. Il est valable 2 heures.",
  };
}
