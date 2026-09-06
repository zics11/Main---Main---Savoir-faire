"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stageDates, stages, transmetteurs } from "@/lib/db/schema";
import { contactRequestEmailHtml, contactRequestEmailText } from "@/lib/email";
import { formatDateRange } from "@/lib/format";
import { sendMail } from "@/lib/mailer";

export type ContactState = { ok?: true; error?: string };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// Renvoie un état plutôt que de rediriger : le formulaire vit dans une
// modale, la confirmation s'affiche donc à l'intérieur sans quitter la fiche.
export async function sendContactRequest(
  transmetteurId: string,
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche) return { error: "Fiche introuvable." };

  const nom = str(formData, "nom");
  const email = str(formData, "email").toLowerCase();
  const message = str(formData, "message");
  if (!nom || !email.includes("@")) {
    return { error: "Le nom et un email valide sont obligatoires." };
  }
  if (!message) {
    return { error: "Le message est obligatoire." };
  }

  const souple = formData.get("souple") === "on";
  const stageId = str(formData, "stageId") || null;
  const stageDateId = souple ? null : str(formData, "stageDateId") || null;

  const stage = stageId
    ? await db.query.stages.findFirst({ where: eq(stages.id, stageId) })
    : null;
  const date = stageDateId
    ? await db.query.stageDates.findFirst({ where: eq(stageDates.id, stageDateId) })
    : null;

  const personnesRaw = Number(formData.get("personnes"));
  const personnes = Number.isFinite(personnesRaw) && personnesRaw > 0 ? personnesRaw : 1;

  const infos = {
    ficheNom: fiche.nomLieu || fiche.nom,
    nom,
    email,
    telephone: str(formData, "telephone") || null,
    provenance: str(formData, "provenance") || null,
    niveau: str(formData, "niveau") || null,
    personnes,
    hebergement: formData.get("hebergement") === "on",
    offreLabel: stage?.titre ?? null,
    dateLabel: date ? formatDateRange(date.dateDebut, date.dateFin) : null,
    message,
  };

  try {
    await sendMail({
      to: fiche.email,
      replyTo: email,
      subject: `Nouvelle demande via Main à Main — ${nom}`,
      html: contactRequestEmailHtml(infos),
      text: contactRequestEmailText(infos),
    });
  } catch (err) {
    console.error("Envoi du message de contact échoué :", err);
    return {
      error:
        "Le message n'a pas pu être envoyé. Réessayez dans un instant, ou écrivez directement par courriel.",
    };
  }

  return { ok: true };
}
