"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { FicheFormState } from "@/app/admin/actions";
import { requireMyTransmetteur } from "@/lib/dal";
import { db } from "@/lib/db";
import { stages, transmetteurs, users } from "@/lib/db/schema";
import {
  applyPhotos,
  champsManquants,
  champsManquantsDemande,
  champsSaisis,
  ErreurFiche,
  applyPortrait,
  parseFicheFields,
  str,
  uniqueSlug,
} from "@/lib/fiche";
import {
  demandePublicationEmailHtml,
  demandePublicationEmailText,
} from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { deleteUploadedPhoto } from "@/lib/upload";
import { enregistrerStage, ErreurStage, type EtatStage } from "@/lib/stage";
import {
  demanderDepuisFormulaire,
  type EtatDemandeTemoignage,
} from "@/lib/demandes-temoignage";

// Every mutation below re-derives the caller's own fiche from their session
// (requireMyTransmetteur) — a transmetteur can never act on a stage or date
// that doesn't belong to their own fiche, regardless of what a form submits.

// La fiche modifiée est toujours celle de la session, jamais un identifiant
// venu du formulaire. `parseFicheFields` ignore `publiee` et l'email : un
// transmetteur ne peut ni publier sa fiche lui-même, ni changer l'adresse qui
// identifie son compte.
export async function updateMyFiche(
  _prev: FicheFormState,
  formData: FormData
): Promise<FicheFormState> {
  const fiche = await requireMyTransmetteur();
  let slug = fiche.slug;
  try {
    const fields = parseFicheFields(formData);
    slug =
      fields.nom === fiche.nom ? fiche.slug : await uniqueSlug(fields.nom, fiche.id);

    await db
      .update(transmetteurs)
      .set({ ...fields, slug, updatedAt: new Date() })
      .where(eq(transmetteurs.id, fiche.id));

    await applyPhotos(fiche.id, fiche.photos, formData);
    await applyPortrait(fiche.id, fiche.photoPortrait, formData);
  } catch (e) {
    if (e instanceof ErreurFiche) {
      return { erreur: e.message, valeurs: champsSaisis(formData) };
    }
    throw e;
  }

  revalidatePath("/mes-stages");
  revalidatePath("/admin");
  revalidatePath(`/admin/fiches/${fiche.id}`);
  revalidatePath(`/fiche/${fiche.slug}`);
  revalidatePath(`/fiche/${slug}`);
  return null;
}

export type DemandeState = { ok: boolean; message: string } | null;

const MESSAGE_BLOQUEE =
  "Votre fiche est suspendue par l'association. Contactez-la pour en savoir plus.";

/**
 * Le transmetteur signale que sa fiche est prête. Il ne publie rien lui-même :
 * la demande prévient l'association par email, qui décide.
 */
export async function demanderPublication(): Promise<DemandeState> {
  const fiche = await requireMyTransmetteur();
  if (fiche.bloqueeLe) {
    return { ok: false, message: MESSAGE_BLOQUEE };
  }
  if (fiche.publiee) {
    return { ok: false, message: "Votre fiche est déjà en ligne." };
  }

  const manquants = champsManquantsDemande(fiche);
  if (manquants.length) {
    return {
      ok: false,
      message: `Demande impossible : votre fiche est incomplète. Il manque encore ${manquants.join(", ")}.`,
    };
  }

  await db
    .update(transmetteurs)
    .set({ publicationDemandeeLe: new Date() })
    .where(eq(transmetteurs.id, fiche.id));

  const destinataires = await db.query.users.findMany({
    where: eq(users.role, "admin"),
    columns: { email: true },
  });
  const url = new URL(
    `/admin/fiches/${fiche.id}`,
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();

  // La demande est enregistrée quoi qu'il arrive : un email qui ne part pas
  // ne doit pas la faire disparaître, l'admin la voit aussi dans son tableau
  // de bord.
  await Promise.all(
    destinataires.map((admin) =>
      sendMail({
        to: admin.email,
        subject: `Demande de publication — ${fiche.nom}`,
        html: demandePublicationEmailHtml(fiche.nom, fiche.email, url),
        text: demandePublicationEmailText(fiche.nom, fiche.email, url),
      }).catch((err) =>
        console.error(`Publication request email to ${admin.email} failed:`, err)
      )
    )
  );

  revalidatePath("/mes-stages");
  revalidatePath("/admin");
  return {
    ok: true,
    message:
      "Demande envoyée à l'association. Votre fiche paraîtra dès qu'elle l'aura validée.",
  };
}

/**
 * Retire la fiche du site, ou l'y remet. Réservé aux fiches déjà validées une
 * fois par l'association : sans cet accord initial, le seul chemin reste la
 * demande de publication ci-dessus.
 */
export async function basculerEnLigne(): Promise<DemandeState> {
  const fiche = await requireMyTransmetteur();
  if (fiche.bloqueeLe) {
    return { ok: false, message: MESSAGE_BLOQUEE };
  }
  if (!fiche.premiereValidationLe) {
    return {
      ok: false,
      message: "Votre fiche doit d'abord être validée par l'association.",
    };
  }

  const remiseEnLigne = !fiche.publiee;
  if (remiseEnLigne) {
    const manquants = champsManquants(fiche);
    if (manquants.length) {
      return { ok: false, message: `Complétez d'abord ${manquants.join(", ")}.` };
    }
  }

  await db
    .update(transmetteurs)
    .set({ publiee: remiseEnLigne })
    .where(eq(transmetteurs.id, fiche.id));

  revalidatePath("/mes-stages");
  revalidatePath("/admin");
  revalidatePath(`/fiche/${fiche.slug}`);
  return {
    ok: true,
    message: remiseEnLigne
      ? "Votre fiche est de nouveau visible sur le site."
      : "Votre fiche est retirée du site. Vous pouvez la remettre en ligne quand vous voulez.",
  };
}

// Un stage et toutes ses dates s'enregistrent d'un seul geste (lib/stage).
// La fiche visée est celle de la session : un stage d'une autre fiche n'est
// jamais trouvé, quel que soit l'identifiant envoyé.
export async function enregistrerMonStage(
  _precedent: EtatStage,
  formData: FormData
): Promise<EtatStage> {
  const fiche = await requireMyTransmetteur();
  try {
    const stageId = await enregistrerStage(
      fiche.id,
      str(formData, "stageId") || null,
      formData
    );
    revalidatePath("/mes-stages");
    return { ok: true, stageId };
  } catch (e) {
    if (e instanceof ErreurStage) {
      revalidatePath("/mes-stages");
      return { ok: false, erreur: e.message };
    }
    throw e;
  }
}

export async function deleteMyStage(stageId: string) {
  const fiche = await requireMyTransmetteur();
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage || stage.transmetteurId !== fiche.id) {
    throw new Error("Ce stage ne vous appartient pas.");
  }
  await Promise.all(stage.photos.map((p) => deleteUploadedPhoto(p)));
  await db.delete(stages).where(eq(stages.id, stageId));
  revalidatePath("/mes-stages");
}

// ─── Demandes de témoignage ───
// Le transmetteur donne le nom et l'adresse d'une personne venue en stage ;
// le site lui écrit. Une seule demande par adresse (lib/demandes-temoignage).

export async function demanderTemoignage(
  _precedent: EtatDemandeTemoignage,
  formData: FormData
): Promise<EtatDemandeTemoignage> {
  const fiche = await requireMyTransmetteur();
  const etat = await demanderDepuisFormulaire(fiche, formData);
  if (etat?.ok) revalidatePath("/mes-stages");
  return etat;
}
