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
import {
  motDePasseEmailHtml,
  motDePasseEmailText,
} from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { genererMotDePasse, hacherMotDePasse } from "@/lib/password";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

/**
 * Erreur de saisie réaffichée dans le formulaire, avec les valeurs soumises :
 * React réinitialise le formulaire après chaque action, il faut donc les lui
 * redonner pour que l'utilisateur ne reperde pas ce qu'il a tapé.
 */
export type FicheFormState =
  | { erreur: string; valeurs: ReturnType<typeof champsSaisis> }
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
    const email = parseEmail(formData);
    if (email !== existing.email && existing.userId) {
      await deplacerCompte(existing.userId, email);
    }
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
        email,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(transmetteurs.id, transmetteurId));

    await applyPhotos(transmetteurId, existing.photos, formData);
    await applyPortrait(transmetteurId, existing.photoPortrait, formData);
  } catch (e) {
    if (e instanceof ErreurFiche) {
      return { erreur: e.message, valeurs: champsSaisis(formData) };
    }
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  revalidatePath(`/fiche/${existing.slug}`);
  revalidatePath(`/fiche/${slug}`);
  revalidatePath("/mes-stages");
  return null;
}

/**
 * Fait suivre au compte rattaché la nouvelle adresse de la fiche : c'est son
 * identifiant de connexion. Le mot de passe, lui, ne change pas.
 */
async function deplacerCompte(userId: string, email: string) {
  const occupant = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (occupant && occupant.id !== userId) {
    throw new ErreurFiche(
      `L'adresse ${email} est déjà celle d'un autre compte. Déliez d'abord la fiche, ou utilisez une autre adresse.`
    );
  }
  await db
    .update(users)
    .set({ email })
    .where(eq(users.id, userId));
}

export type InvitationState = { ok: boolean; message: string } | null;

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

// Détache le compte de la fiche sans supprimer ni l'un ni l'autre : le
// transmetteur perd l'accès à cette fiche, et l'email redevient librement
// modifiable. Sert notamment à corriger une invitation envoyée par erreur.
export async function delierCompte(
  transmetteurId: string
): Promise<InvitationState> {
  await requireAdmin();
  await db
    .update(transmetteurs)
    .set({ userId: null })
    .where(eq(transmetteurs.id, transmetteurId));
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return { ok: true, message: "Compte délié de cette fiche." };
}

/**
 * Tire un nouveau mot de passe et l'envoie directement au transmetteur.
 *
 * L'email part AVANT l'enregistrement : si l'envoi échoue, l'ancien mot de
 * passe continue de fonctionner, plutôt que de laisser le transmetteur avec
 * un mot de passe que personne ne connaît.
 */
export async function envoyerMotDePasseTransmetteur(
  transmetteurId: string
): Promise<InvitationState> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!fiche?.userId) {
    return {
      ok: false,
      message: "Cette fiche n'a pas encore de compte : envoyez d'abord l'invitation.",
    };
  }

  const motDePasse = genererMotDePasse();
  const url = new URL(
    "/connexion",
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();

  try {
    await sendMail({
      to: fiche.email,
      subject: "Votre mot de passe Main à Main",
      html: motDePasseEmailHtml(motDePasse, url),
      text: motDePasseEmailText(motDePasse, url),
    });
  } catch (err) {
    console.error(`Password email to ${fiche.email} failed to send:`, err);
    return {
      ok: false,
      message: `L'email n'a pas pu partir : le mot de passe n'a pas été changé. Vérifiez l'adresse ${fiche.email}.`,
    };
  }

  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, fiche.userId));

  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return {
    ok: true,
    message: `Nouveau mot de passe envoyé à ${fiche.email}.`,
  };
}

// Crée le compte du transmetteur (s'il n'existe pas) et (r)envoie
// l'invitation — indispensable pour les fiches créées sans invitation.
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
