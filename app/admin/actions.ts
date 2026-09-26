"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { stageDates, stages, temoignages, transmetteurs, users } from "@/lib/db/schema";
import {
  applyPhotos,
  champsManquants,
  prevenirMiseEnLigne,
  champsSaisis,
  ErreurFiche,
  applyPortrait,
  inviteTransmetteur,
  optionalStr,
  parseEmail,
  parseFicheFields,
  str,
  uniqueSlug,
} from "@/lib/fiche";
import { changementEmailHtml, changementEmailText } from "@/lib/email";
import {
  annulerChangementEmail,
  demanderChangementEmail,
  lienConfirmationEmail,
} from "@/lib/activation";
import { sendMail } from "@/lib/mailer";
import { envoyerLienReinitialisation } from "@/lib/reinitialisation";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

/**
 * Erreur de saisie réaffichée dans le formulaire, avec les valeurs soumises :
 * React réinitialise le formulaire après chaque action, il faut donc les lui
 * redonner pour que l'utilisateur ne reperde pas ce qu'il a tapé.
 */
export type FicheFormState =
  | { erreur: string; valeurs: ReturnType<typeof champsSaisis> }
  | { info: string }
  | null;

export async function createFiche(
  _prev: FicheFormState,
  formData: FormData
): Promise<FicheFormState> {
  await requireAdmin();
  let ficheId: string;
  try {
    const fields = parseFicheFields(formData);
    const email = parseEmail(formData);
    const slug = await uniqueSlug(fields.nom);

    const [fiche] = await db
      .insert(transmetteurs)
      .values({
        ...fields,
        // Une fiche naît incomplète : elle ne peut pas être publiée tout de
        // suite, c'est l'admin qui le fera une fois remplie.
        publiee: false,
        email,
        slug,
        photos: [],
      })
      .returning();

    await inviteTransmetteur(fiche.id, email, fields.nom);
    ficheId = fiche.id;
  } catch (e) {
    if (e instanceof ErreurFiche) {
      return { erreur: e.message, valeurs: champsSaisis(formData) };
    }
    throw e;
  }

  revalidatePath("/admin");
  // Hors du try : redirect() fonctionne en levant une exception, qu'il ne faut
  // pas confondre avec une erreur de saisie.
  redirect(`/admin/fiches/${ficheId}`);
}

export async function updateFiche(
  transmetteurId: string,
  _prev: FicheFormState,
  formData: FormData
): Promise<FicheFormState> {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) {
    return { erreur: "Fiche introuvable.", valeurs: champsSaisis(formData) };
  }

  let slug = existing.slug;
  let miseEnLigne = false;
  try {
    const fields = parseFicheFields(formData);
    // Une fiche bloquée ne se publie pas, et rien d'incomplet ne part en
    // ligne : sans savoir-faire, lieu ou point sur la carte, la fiche n'a
    // rien à montrer ni où s'afficher.
    const publiee = formData.get("publiee") === "on" && !existing.bloqueeLe;
    if (publiee) {
      const manquants = champsManquants(fields);
      if (manquants.length) {
        throw new ErreurFiche(
          `Impossible de publier : il manque ${manquants.join(", ")}.`
        );
      }
    }
    // L'email de la fiche est aussi l'identifiant de connexion du
    // transmetteur : le changer déplace aussi le compte rattaché.
    slug =
      fields.nom === existing.nom
        ? existing.slug
        : await uniqueSlug(fields.nom, transmetteurId);

    await db
      .update(transmetteurs)
      .set({
        ...fields,
        publiee,
        // Trace du premier accord : ensuite, le transmetteur peut retirer et
        // remettre sa fiche en ligne sans nouvelle validation.
        premiereValidationLe:
          publiee && !existing.premiereValidationLe
            ? new Date()
            : existing.premiereValidationLe,
        // Une demande en cours n'est soldée que si la fiche part en ligne :
        // éditer une fiche en attente ne doit pas effacer sa demande.
        publicationDemandeeLe: publiee ? null : existing.publicationDemandeeLe,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(transmetteurs.id, transmetteurId));

    await applyPhotos(transmetteurId, existing.photos, formData);
    await applyPortrait(transmetteurId, existing.photoPortrait, formData);
    miseEnLigne = publiee && !existing.publiee;
  } catch (e) {
    if (e instanceof ErreurFiche) {
      return { erreur: e.message, valeurs: champsSaisis(formData) };
    }
    throw e;
  }

  // Mise en ligne : le transmetteur l'apprend par email.
  if (miseEnLigne) await prevenirMiseEnLigne({ ...existing, slug });

  revalidatePath("/admin");
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  revalidatePath(`/fiche/${existing.slug}`);
  revalidatePath(`/fiche/${slug}`);
  revalidatePath("/mes-stages");
  return null;
}

/**
 * Changer l'adresse d'un compte ne prend effet qu'après confirmation : le
 * lien part à la NOUVELLE adresse, et l'ancienne continue de fonctionner
 * jusque-là. Sans ça, une faute de frappe enfermerait le transmetteur dehors.
 */
async function demanderNouvelEmail(
  userId: string,
  email: string,
  ficheNom: string
) {
  const occupant = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (occupant && occupant.id !== userId) {
    throw new ErreurFiche(
      `L'adresse ${email} est déjà celle d'un autre compte. Déliez d'abord la fiche, ou utilisez une autre adresse.`
    );
  }

  const url = lienConfirmationEmail(await demanderChangementEmail(userId, email));
  try {
    await sendMail({
      to: email,
      subject: "Confirmez votre nouvelle adresse — Main à Main",
      html: changementEmailHtml(ficheNom, url),
      text: changementEmailText(ficheNom, url),
    });
  } catch (err) {
    console.error(`Email change confirmation to ${email} failed to send:`, err);
    await annulerChangementEmail(userId);
    throw new ErreurFiche(
      `L'email de confirmation n'a pas pu partir à ${email} : l'adresse n'a pas été changée.`
    );
  }
}

export type InvitationState = { ok: boolean; message: string } | null;

/**
 * Change l'adresse d'une fiche. Avec un compte rattaché, elle ne bascule
 * qu'une fois le lien de confirmation cliqué (voir demanderNouvelEmail) ;
 * sans compte, il n'y a rien à confirmer.
 */
export async function changerEmailFiche(
  transmetteurId: string,
  _prev: InvitationState,
  formData: FormData
): Promise<InvitationState> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche) return { ok: false, message: "Fiche introuvable." };

  let email: string;
  try {
    email = parseEmail(formData);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof ErreurFiche ? e.message : "Adresse invalide.",
    };
  }
  if (email === fiche.email) {
    return { ok: false, message: "C'est déjà l'adresse de cette fiche." };
  }

  if (!fiche.userId) {
    await db
      .update(transmetteurs)
      .set({ email, updatedAt: new Date() })
      .where(eq(transmetteurs.id, transmetteurId));
    revalidatePath(`/admin/fiches/${transmetteurId}`);
    return { ok: true, message: `Adresse remplacée par ${email}.` };
  }

  try {
    await demanderNouvelEmail(fiche.userId, email, fiche.nom);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof ErreurFiche ? e.message : "Changement impossible.",
    };
  }

  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return {
    ok: true,
    message: `Un email de confirmation est parti à ${email}. L'adresse ne changera qu'une fois le lien cliqué ; d'ici là, l'ancienne reste valable.`,
  };
}

/** Abandonne un changement d'adresse que le transmetteur n'a pas confirmé. */
export async function annulerNouvelEmail(
  transmetteurId: string
): Promise<InvitationState> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche?.userId) return { ok: false, message: "Fiche sans compte." };

  await annulerChangementEmail(fiche.userId);
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return { ok: true, message: "Changement d'adresse annulé." };
}

/**
 * Suspend une fiche, ou lève la suspension. Une fiche bloquée quitte le site
 * et le transmetteur ne peut ni la remettre en ligne ni redemander sa
 * publication : seule l'association peut revenir en arrière.
 */
export async function basculerBlocage(transmetteurId: string) {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) return;

  const blocage = existing.bloqueeLe === null;
  await db
    .update(transmetteurs)
    .set({
      bloqueeLe: blocage ? new Date() : null,
      // Lever le blocage ne remet pas la fiche en ligne : c'est une décision
      // à part, prise juste après si elle s'impose.
      ...(blocage ? { publiee: false, publicationDemandeeLe: null } : {}),
    })
    .where(eq(transmetteurs.id, transmetteurId));

  revalidatePath("/admin");
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  revalidatePath("/mes-stages");
  revalidatePath(`/fiche/${existing.slug}`);
}

/**
 * Envoie au transmetteur le lien « nouveau mot de passe » : il en choisit un
 * lui-même, et l'actuel reste valable tant qu'il ne l'a pas utilisé.
 */
export async function envoyerRecuperation(
  transmetteurId: string
): Promise<InvitationState> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche?.userId) {
    return { ok: false, message: "Cette fiche n'a pas de compte rattaché." };
  }

  const envoye = await envoyerLienReinitialisation(fiche.email);
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return envoye
    ? {
        ok: true,
        message: `Mail de récupération envoyé à ${fiche.email}. Le lien est valable 2 heures.`,
      }
    : { ok: false, message: `L'email n'a pas pu partir à ${fiche.email}.` };
}

export async function inviterTransmetteur(
  transmetteurId: string
): Promise<InvitationState> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche) return { ok: false, message: "Fiche introuvable." };

  const envoye = await inviteTransmetteur(fiche.id, fiche.email, fiche.nom);
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return envoye
    ? { ok: true, message: `Invitation envoyée à ${fiche.email}.` }
    : {
        ok: false,
        message: `Le compte est créé, mais l'email n'a pas pu partir. ${fiche.email} peut tout de même se connecter depuis la page Connexion.`,
      };
}

export async function deleteFiche(transmetteurId: string) {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) return;

  const sesStages = await db.query.stages.findMany({
    where: eq(stages.transmetteurId, transmetteurId),
    columns: { photos: true },
  });

  await Promise.all(existing.photos.map((p) => deleteUploadedPhoto(p)));
  if (existing.photoPortrait) await deleteUploadedPhoto(existing.photoPortrait);
  await Promise.all(sesStages.flatMap((s) => s.photos.map((p) => deleteUploadedPhoto(p))));
  await db.delete(transmetteurs).where(eq(transmetteurs.id, transmetteurId));

  revalidatePath("/admin");
  redirect("/admin");
}

export async function togglePubliee(transmetteurId: string) {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) return;
  // Même garde-fou que dans updateFiche : une fiche incomplète reste hors
  // ligne, quel que soit le chemin emprunté.
  if (existing.bloqueeLe) return;
  if (!existing.publiee && champsManquants(existing).length) return;
  await db
    .update(transmetteurs)
    // La demande est tranchée dans les deux sens : publier y répond, masquer
    // la retire (le transmetteur pourra en refaire une).
    .set({
      publiee: !existing.publiee,
      publicationDemandeeLe: null,
      premiereValidationLe:
        !existing.publiee && !existing.premiereValidationLe
          ? new Date()
          : existing.premiereValidationLe,
    })
    .where(eq(transmetteurs.id, transmetteurId));

  // Mise en ligne : le transmetteur l'apprend par email, sans avoir à guetter.
  if (!existing.publiee) await prevenirMiseEnLigne(existing);

  revalidatePath("/admin");
  revalidatePath("/mes-stages");
}

// ─── Stages (admin can manage any transmetteur's) ───

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
  return {
    titre: str(formData, "titre"),
    type: optionalStr(formData, "type"),
    niveau: optionalStr(formData, "niveau"),
    duree: optionalStr(formData, "duree"),
    prix: optionalStr(formData, "prix"),
    description: str(formData, "description"),
    programme: parseProgramme(formData),
    note: optionalStr(formData, "note"),
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

export async function createStage(transmetteurId: string, formData: FormData) {
  await requireAdmin();
  const stageId = randomUUID();
  await db.insert(stages).values({
    id: stageId,
    transmetteurId,
    ...parseStageFields(formData),
  });
  await applyStagePhotos(stageId, [], formData);
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

export async function updateStage(
  transmetteurId: string,
  stageId: string,
  formData: FormData
) {
  await requireAdmin();
  const existing = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!existing) throw new Error("Stage introuvable.");

  await db
    .update(stages)
    .set({ ...parseStageFields(formData), updatedAt: new Date() })
    .where(eq(stages.id, stageId));
  await applyStagePhotos(stageId, existing.photos, formData);
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

export async function deleteStage(transmetteurId: string, stageId: string) {
  await requireAdmin();
  const existing = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (existing) await Promise.all(existing.photos.map((p) => deleteUploadedPhoto(p)));
  await db.delete(stages).where(eq(stages.id, stageId));
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

// ─── Dates d'un stage (un même stage peut avoir plusieurs dates) ───

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

export async function createStageDate(
  transmetteurId: string,
  stageId: string,
  formData: FormData
) {
  await requireAdmin();
  await db.insert(stageDates).values({
    id: randomUUID(),
    stageId,
    ...parseStageDateFields(formData),
  });
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

export async function updateStageDate(
  transmetteurId: string,
  stageDateId: string,
  formData: FormData
) {
  await requireAdmin();
  await db
    .update(stageDates)
    .set({ ...parseStageDateFields(formData), updatedAt: new Date() })
    .where(eq(stageDates.id, stageDateId));
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

export async function deleteStageDate(transmetteurId: string, stageDateId: string) {
  await requireAdmin();
  await db.delete(stageDates).where(eq(stageDates.id, stageDateId));
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

// ─── Témoignages (curated by admin — no public submission flow) ───

export async function createTemoignage(transmetteurId: string, formData: FormData) {
  await requireAdmin();
  const texte = str(formData, "texte");
  const auteur = str(formData, "auteur");
  const contexte = str(formData, "contexte");
  if (!texte || !auteur || !contexte) {
    throw new Error("Le texte, l'auteur et le contexte sont obligatoires.");
  }
  await db.insert(temoignages).values({ transmetteurId, texte, auteur, contexte });
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}

export async function deleteTemoignage(transmetteurId: string, temoignageId: string) {
  await requireAdmin();
  await db.delete(temoignages).where(eq(temoignages.id, temoignageId));
  revalidatePath(`/admin/fiches/${transmetteurId}`);
}
