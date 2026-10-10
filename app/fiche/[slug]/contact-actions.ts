"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stageDates, stages, transmetteurs } from "@/lib/db/schema";
import {
  confirmationDemandeHtml,
  confirmationDemandeText,
  contactRequestEmailHtml,
  contactRequestEmailText,
} from "@/lib/email";
import {
  CONTRIBUTION_TRANSMETTEUR,
  enEuros,
  MONTANTS_TRANSMETTEUR,
} from "@/lib/dons";
import { encartEmail } from "@/lib/dons-serveur";
import { marquerConfirmee, noterDemande } from "@/lib/demandes-contact";
import { formatDebutEtDuree } from "@/lib/format";
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
    dateLabel: date
      ? formatDebutEtDuree(date.dateDebut, date.dateFin, stage?.duree ?? null)
      : null,
    message,
  };

  // Le mot pour soutenir, en pied d'email, une fois les dons ouverts.
  // L'encart de l'espace transmetteur : sa contribution, par an.
  const soutienTransmetteur = encartEmail("email-transmetteur", {
    titre: "Main à Main vit de dons",
    texte: `Cette demande vous arrive sans aucune commission : le site ne vit que de dons. S'il vous amène des stagiaires, une contribution — conseillée ${enEuros(CONTRIBUTION_TRANSMETTEUR)} par an — l'aide à durer.`,
    montants: MONTANTS_TRANSMETTEUR,
    conseille: CONTRIBUTION_TRANSMETTEUR,
    suffixe: " / an",
  });

  try {
    await sendMail({
      to: fiche.email,
      replyTo: email,
      subject: `Nouvelle demande via Main à Main — ${nom}`,
      html: contactRequestEmailHtml(infos, soutienTransmetteur),
      text: contactRequestEmailText(infos, soutienTransmetteur),
    });
  } catch (err) {
    console.error("Envoi du message de contact échoué :", err);
    return {
      error:
        "Le message n'a pas pu être envoyé. Réessayez dans un instant, ou écrivez directement par courriel.",
    };
  }

  // La demande est partie : on la compte, et l'apprenant en reçoit la
  // confirmation. Un échec ici n'annule rien — le transmetteur a son message.
  try {
    const { id, confirmer } = await noterDemande({
      transmetteurId: fiche.id,
      stageId: stage?.transmetteurId === fiche.id ? stage.id : null,
      email,
    });
    if (confirmer) {
      // Le même encart que la fenêtre qui s'affiche après l'envoi.
      const soutien = encartEmail("email-apprenant", {
        titre: "Un coup de pouce, à prix libre ?",
        texte: `Main à Main ne prend aucune commission, ni sur votre stage ni chez ${infos.ficheNom}. Le site vit de dons : quelques euros suffisent à faire tenir la prochaine rencontre.`,
      });
      const confirmation = {
        nom,
        ficheNom: infos.ficheNom,
        ficheUrl: new URL(
          `/fiche/${fiche.slug}`,
          process.env.AUTH_URL ?? "http://localhost:3000"
        ).toString(),
        offreLabel: infos.offreLabel,
        dateLabel: infos.dateLabel,
      };
      await sendMail({
        to: email,
        replyTo: fiche.email,
        subject: `Votre demande est partie chez ${infos.ficheNom}`,
        html: confirmationDemandeHtml(confirmation, soutien),
        text: confirmationDemandeText(confirmation, soutien),
      });
      await marquerConfirmee(id);
    }
  } catch (err) {
    console.error("Confirmation de la demande non envoyée :", err);
  }

  return { ok: true };
}
