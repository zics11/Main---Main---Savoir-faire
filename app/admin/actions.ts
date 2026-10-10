"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { stages, temoignages, transmetteurs, users } from "@/lib/db/schema";
import {
  applyPhotos,
  champsManquants,
  prevenirMiseEnLigne,
  champsSaisis,
  ErreurFiche,
  applyPortrait,
  inviteTransmetteur,
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
import {
  demanderDepuisFormulaire,
  type EtatDemandeTemoignage,
} from "@/lib/demandes-temoignage";
import { envoyerLienReinitialisation } from "@/lib/reinitialisation";
import {
  enregistrerStage as enregistrerStageEtDates,
  ErreurStage,
  type EtatStage,
} from "@/lib/stage";
import { deleteUploadedPhoto } from "@/lib/upload";

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
  try {
    const fields = parseFicheFields(formData);
    // La visibilité ne passe plus par ce formulaire : elle se règle depuis
    // la barre du bas, dans n'importe quel onglet (changerVisibilite). Une
    // fiche en ligne doit pourtant le rester complète : sans savoir-faire,
    // commune ou point sur la carte, elle n'aurait rien à montrer.
    if (existing.publiee) {
      const manquants = champsManquants(fields);
      if (manquants.length) {
        throw new ErreurFiche(
          `La fiche est en ligne : il lui faut ${manquants.join(", ")}. Retirez-la du site avant de vider ces champs.`
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
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  revalidatePath(`/fiche/${existing.slug}`);
  revalidatePath("/mes-stages");
}

/**
 * La case « Fiche visible sur le site » de la barre du bas : elle agit tout
 * de suite, depuis n'importe quel onglet. Rien ne change si la fiche est
 * déjà dans l'état demandé.
 */
export async function changerVisibilite(
  transmetteurId: string,
  visible: boolean
): Promise<string | null> {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) return "Fiche introuvable.";
  if (existing.publiee === visible) return null;
  if (existing.bloqueeLe) {
    return "Fiche bloquée : levez d'abord le blocage dans l'onglet Administration.";
  }
  const manquants = champsManquants(existing);
  if (visible && manquants.length) {
    return `Impossible de mettre en ligne : il manque ${manquants.join(", ")}.`;
  }
  await togglePubliee(transmetteurId);
  return null;
}

// ─── Stages et leurs dates ───
// Un stage et toutes ses dates s'enregistrent d'un seul geste (lib/stage).

export async function enregistrerStage(
  transmetteurId: string,
  _precedent: EtatStage,
  formData: FormData
): Promise<EtatStage> {
  await requireAdmin();
  try {
    const stageId = await enregistrerStageEtDates(
      transmetteurId,
      str(formData, "stageId") || null,
      formData
    );
    revalidatePath(`/admin/fiches/${transmetteurId}`);
    return { ok: true, stageId };
  } catch (e) {
    if (e instanceof ErreurStage) {
      revalidatePath(`/admin/fiches/${transmetteurId}`);
      return { ok: false, erreur: e.message };
    }
    throw e;
  }
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

// ─── Témoignages ───
// Recueillis par l'association (pas de dépôt public), et enregistrés d'un
// seul geste depuis la barre du bas : le formulaire envoie la liste complète
// telle qu'elle doit être, et on aligne la base dessus.

export type EtatTemoignages = { ok: true } | { ok: false; erreur: string } | null;

type TemoignageSaisi = {
  id: string | null;
  texte: string;
  auteur: string;
  contexte: string;
};

export async function enregistrerTemoignages(
  transmetteurId: string,
  _precedent: EtatTemoignages,
  formData: FormData
): Promise<EtatTemoignages> {
  await requireAdmin();

  let saisis: TemoignageSaisi[];
  try {
    const brut = JSON.parse(str(formData, "temoignages") || "[]");
    saisis = (Array.isArray(brut) ? brut : []).map((t) => ({
      id: typeof t?.id === "string" ? t.id : null,
      texte: String(t?.texte ?? "").trim(),
      auteur: String(t?.auteur ?? "").trim(),
      contexte: String(t?.contexte ?? "").trim(),
    }));
  } catch {
    return { ok: false, erreur: "Le formulaire est mal formé : rechargez la page." };
  }
  const incomplet = saisis.findIndex((t) => !t.texte || !t.auteur || !t.contexte);
  if (incomplet !== -1) {
    return {
      ok: false,
      erreur: `Témoignage n° ${incomplet + 1} : le texte, l'auteur et le contexte sont obligatoires.`,
    };
  }

  // Seuls les témoignages de cette fiche peuvent être modifiés ou retirés.
  const existants = await db.query.temoignages.findMany({
    where: eq(temoignages.transmetteurId, transmetteurId),
    columns: { id: true },
  });
  const connus = new Set(existants.map((t) => t.id));

  db.transaction((tx) => {
    const gardes = new Set<string>();
    for (const t of saisis) {
      const valeurs = { texte: t.texte, auteur: t.auteur, contexte: t.contexte };
      if (t.id && connus.has(t.id)) {
        tx.update(temoignages).set(valeurs).where(eq(temoignages.id, t.id)).run();
        gardes.add(t.id);
      } else {
        tx.insert(temoignages).values({ transmetteurId, ...valeurs }).run();
      }
    }
    for (const id of connus) {
      if (!gardes.has(id)) tx.delete(temoignages).where(eq(temoignages.id, id)).run();
    }
  });

  revalidatePath(`/admin/fiches/${transmetteurId}`);
  return { ok: true };
}

/**
 * Demande un témoignage au nom d'une fiche, comme le transmetteur peut le
 * faire depuis son espace : mêmes règles, une seule demande par adresse.
 */
export async function demanderTemoignageAdmin(
  transmetteurId: string,
  _precedent: EtatDemandeTemoignage,
  formData: FormData
): Promise<EtatDemandeTemoignage> {
  await requireAdmin();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
    columns: { id: true, nom: true, nomLieu: true, email: true },
  });
  if (!fiche) return { ok: false, erreur: "Fiche introuvable.", valeurs: { nom: "", email: "", stageId: "" } };
  const etat = await demanderDepuisFormulaire(fiche, formData);
  if (etat?.ok) revalidatePath(`/admin/fiches/${transmetteurId}`);
  return etat;
}
