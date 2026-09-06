"use server";

import { randomUUID } from "crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  DOMAINES,
  stageDates,
  stages,
  temoignages,
  transmetteurs,
  users,
  type Domaine,
} from "@/lib/db/schema";
import { inviteEmailHtml, inviteEmailText } from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { slugify } from "@/lib/slug";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

async function uniqueSlug(base: string, ignoreId?: string) {
  const slugBase = slugify(base) || "transmetteur";
  let slug = slugBase;
  let i = 2;
  while (
    await db.query.transmetteurs.findFirst({
      where: ignoreId
        ? and(eq(transmetteurs.slug, slug), ne(transmetteurs.id, ignoreId))
        : eq(transmetteurs.slug, slug),
    })
  ) {
    slug = `${slugBase}-${i++}`;
  }
  return slug;
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === "" ? null : v;
}

function parseFicheFields(formData: FormData) {
  const domaine = str(formData, "domaine");
  if (!DOMAINES.includes(domaine as Domaine)) {
    throw new Error("Domaine invalide.");
  }
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Placez le point sur la carte.");
  }

  const nom = str(formData, "nom");
  const savoirFaire = str(formData, "savoirFaire");
  const lieuApproximatif = str(formData, "lieuApproximatif");
  if (!nom || !savoirFaire || !lieuApproximatif) {
    throw new Error(
      "Le nom, le savoir-faire et le lieu approximatif sont obligatoires."
    );
  }

  return {
    nom,
    nomLieu: optionalStr(formData, "nomLieu"),
    metier: optionalStr(formData, "metier"),
    histoire: str(formData, "histoire"),
    domaine: domaine as Domaine,
    savoirFaire,
    siteWeb: optionalStr(formData, "siteWeb"),
    reseauxSociaux: optionalStr(formData, "reseauxSociaux"),
    lat,
    lng,
    lieuApproximatif,
    modalitesAccueil: optionalStr(formData, "modalitesAccueil"),
    hebergement: formData.get("hebergement") === "on",
    repas: formData.get("repas") === "on",
    typeRepas: optionalStr(formData, "typeRepas"),
    publiee: formData.get("publiee") === "on",
  };
}

// email is only ever set at creation (it's the transmetteur account's
// identity) — the edit form disables it, so it's never re-parsed on update.
function parseEmail(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  if (!email.includes("@")) throw new Error("Email invalide.");
  return email;
}

async function applyPhotos(
  transmetteurId: string,
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
    .update(transmetteurs)
    .set({ photos: [...kept, ...added] })
    .where(eq(transmetteurs.id, transmetteurId));
}

// Portrait du transmetteur : une seule photo, distincte de la galerie
// ci-dessus. Un fichier envoyé remplace l'existant ; sinon "removePortrait"
// permet de le retirer sans le remplacer.
async function applyPortrait(
  transmetteurId: string,
  existingPortrait: string | null,
  formData: FormData
) {
  const file = formData.get("portrait");
  const remove = formData.get("removePortrait") === "on";

  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedPhoto(file);
    if (existingPortrait) await deleteUploadedPhoto(existingPortrait);
    await db
      .update(transmetteurs)
      .set({ photoPortrait: saved })
      .where(eq(transmetteurs.id, transmetteurId));
  } else if (remove && existingPortrait) {
    await deleteUploadedPhoto(existingPortrait);
    await db
      .update(transmetteurs)
      .set({ photoPortrait: null })
      .where(eq(transmetteurs.id, transmetteurId));
  }
}

export async function createFiche(formData: FormData) {
  await requireAdmin();
  const fields = parseFicheFields(formData);
  const email = parseEmail(formData);
  const slug = await uniqueSlug(fields.nom);

  const [fiche] = await db
    .insert(transmetteurs)
    .values({ ...fields, email, slug, photos: [] })
    .returning();

  await applyPhotos(fiche.id, [], formData);
  await applyPortrait(fiche.id, null, formData);
  await inviteTransmetteur(fiche.id, email, fields.nom);

  revalidatePath("/admin");
  redirect(`/admin/fiches/${fiche.id}`);
}

export async function updateFiche(transmetteurId: string, formData: FormData) {
  await requireAdmin();
  const existing = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, transmetteurId),
  });
  if (!existing) throw new Error("Fiche introuvable.");

  const fields = parseFicheFields(formData);
  const slug =
    fields.nom === existing.nom
      ? existing.slug
      : await uniqueSlug(fields.nom, transmetteurId);

  await db
    .update(transmetteurs)
    .set({ ...fields, slug, updatedAt: new Date() })
    .where(eq(transmetteurs.id, transmetteurId));

  await applyPhotos(transmetteurId, existing.photos, formData);
  await applyPortrait(transmetteurId, existing.photoPortrait, formData);

  revalidatePath("/admin");
  revalidatePath(`/admin/fiches/${transmetteurId}`);
  revalidatePath(`/fiche/${slug}`);
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
  await db
    .update(transmetteurs)
    .set({ publiee: !existing.publiee })
    .where(eq(transmetteurs.id, transmetteurId));
  revalidatePath("/admin");
}

// Creates (or reuses) the transmetteur's user account and links it to the
// fiche, then emails them so they can sign in via magic link.
async function inviteTransmetteur(transmetteurId: string, email: string, ficheNom: string) {
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, role: "transmetteur" })
      .returning();
  }

  await db
    .update(transmetteurs)
    .set({ userId: user.id })
    .where(eq(transmetteurs.id, transmetteurId));

  const url = new URL("/connexion", process.env.AUTH_URL ?? "http://localhost:3000");
  try {
    await sendMail({
      to: email,
      subject: "Votre fiche Main à Main est prête",
      html: inviteEmailHtml(ficheNom, url.toString()),
      text: inviteEmailText(ficheNom, url.toString()),
    });
  } catch (err) {
    // The fiche and account are already created at this point — a down or
    // misconfigured SMTP relay shouldn't block that. The admin can still
    // tell the transmetteur to sign in manually with their email.
    console.error(`Invitation email to ${email} failed to send:`, err);
  }
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
