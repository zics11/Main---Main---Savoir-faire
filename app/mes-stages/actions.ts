"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { FicheFormState } from "@/app/admin/actions";
import { requireMyTransmetteur } from "@/lib/dal";
import { db } from "@/lib/db";
import { stageDates, stages, transmetteurs, users } from "@/lib/db/schema";
import {
  applyPhotos,
  champsManquants,
  champsSaisis,
  ErreurFiche,
  applyPortrait,
  optionalStr,
  parseFicheFields,
  str,
  uniqueSlug,
} from "@/lib/fiche";
import {
  demandePublicationEmailHtml,
  demandePublicationEmailText,
} from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

// One "heure | titre" pair per line, e.g. "7 h | Rafraîchi du levain" —
// simplest way to edit a same-day schedule from a plain <textarea>.
function parseProgramme(formData: FormData) {
  return str(formData, "programme")
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter(([heure, titre]) => heure && titre)
    .map(([heure, titre]) => ({ heure, titre }));
}

function parseStageFields(formData: FormData) {
  const titre = str(formData, "titre");
  if (!titre) throw new Error("L'intitulé est obligatoire.");
  return {
    titre,
    type: optionalStr(formData, "type"),
    niveau: optionalStr(formData, "niveau"),
    duree: optionalStr(formData, "duree"),
    prix: optionalStr(formData, "prix"),
    description: str(formData, "description"),
    programme: parseProgramme(formData),
    note: optionalStr(formData, "note"),
  };
}

function parseStageDateFields(formData: FormData) {
  const dateDebut = new Date(str(formData, "dateDebut"));
  const dateFin = new Date(str(formData, "dateFin"));
  if (Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    throw new Error("Dates invalides.");
  }
  const placesRaw = str(formData, "places");
  const inscritsRaw = str(formData, "inscrits");
  return {
    dateDebut,
    dateFin,
    places: placesRaw === "" ? null : Number(placesRaw),
    inscrits: inscritsRaw === "" ? 0 : Number(inscritsRaw),
    publiee: formData.get("publiee") === "on",
  };
}

// Photos d'un stage : même logique (garder/ajouter/supprimer) que les
// photos de la fiche, juste ciblée sur la table stages.
async function applyStagePhotos(
  stageId: string,
  existingPhotos: string[],
  formData: FormData
) {
  const keep = new Set(formData.getAll("keepPhotos").map(String));
  const kept = existingPhotos.filter((p) => keep.has(p));
  const removed = existingPhotos.filter((p) => !keep.has(p));

  const newFiles = formData.getAll("photos").filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  const added: string[] = [];
  for (const file of newFiles) {
    added.push(await saveUploadedPhoto(file));
  }

  await Promise.all(removed.map((p) => deleteUploadedPhoto(p)));

  await db
    .update(stages)
    .set({ photos: [...kept, ...added] })
    .where(eq(stages.id, stageId));
}

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

  const manquants = champsManquants(fiche);
  if (manquants.length) {
    return {
      ok: false,
      message: `Complétez d'abord ${manquants.join(", ")}.`,
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

export async function createMyStage(formData: FormData) {
  const fiche = await requireMyTransmetteur();
  const stageId = randomUUID();
  await db.insert(stages).values({
    id: stageId,
    transmetteurId: fiche.id,
    ...parseStageFields(formData),
  });
  await applyStagePhotos(stageId, [], formData);
  revalidatePath("/mes-stages");
}

export async function updateMyStage(stageId: string, formData: FormData) {
  const fiche = await requireMyTransmetteur();
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage || stage.transmetteurId !== fiche.id) {
    throw new Error("Ce stage ne vous appartient pas.");
  }
  await db
    .update(stages)
    .set({ ...parseStageFields(formData), updatedAt: new Date() })
    .where(eq(stages.id, stageId));
  await applyStagePhotos(stageId, stage.photos, formData);
  revalidatePath("/mes-stages");
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

export async function createMyStageDate(stageId: string, formData: FormData) {
  const fiche = await requireMyTransmetteur();
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage || stage.transmetteurId !== fiche.id) {
    throw new Error("Ce stage ne vous appartient pas.");
  }
  await db.insert(stageDates).values({
    id: randomUUID(),
    stageId,
    ...parseStageDateFields(formData),
  });
  revalidatePath("/mes-stages");
}

export async function updateMyStageDate(stageDateId: string, formData: FormData) {
  const fiche = await requireMyTransmetteur();
  const date = await db.query.stageDates.findFirst({
    where: eq(stageDates.id, stageDateId),
    with: { stage: true },
  });
  if (!date || date.stage.transmetteurId !== fiche.id) {
    throw new Error("Cette date ne vous appartient pas.");
  }
  await db
    .update(stageDates)
    .set({ ...parseStageDateFields(formData), updatedAt: new Date() })
    .where(eq(stageDates.id, stageDateId));
  revalidatePath("/mes-stages");
}

export async function deleteMyStageDate(stageDateId: string) {
  const fiche = await requireMyTransmetteur();
  const date = await db.query.stageDates.findFirst({
    where: eq(stageDates.id, stageDateId),
    with: { stage: true },
  });
  if (!date || date.stage.transmetteurId !== fiche.id) {
    throw new Error("Cette date ne vous appartient pas.");
  }
  await db.delete(stageDates).where(eq(stageDates.id, stageDateId));
  revalidatePath("/mes-stages");
}
