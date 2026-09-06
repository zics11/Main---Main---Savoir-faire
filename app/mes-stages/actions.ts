"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireMyTransmetteur } from "@/lib/dal";
import { db } from "@/lib/db";
import { stageDates, stages } from "@/lib/db/schema";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === "" ? null : v;
}

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
