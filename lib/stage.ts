import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stageDates, stages } from "@/lib/db/schema";
import {
  DUREE_MAX,
  ecrireDuree,
  finDuStage,
  UNITES_DUREE,
  type UniteDuree,
} from "@/lib/duree";
import { optionalStr, str } from "@/lib/fiche";
import { accorderProgramme, lireProgramme } from "@/lib/programme";
import { ordonnerPhotos } from "@/lib/ordre-photos";
import {
  deleteUploadedPhoto,
  saveUploadedPhoto,
  UploadError,
} from "@/lib/upload";

// Enregistrement d'un stage, partagé entre l'admin et l'espace transmetteur.
// Un stage et ses dates s'enregistrent d'un seul geste : le formulaire envoie
// la liste complète des dates telle qu'elle doit être, et on aligne la base
// dessus (mise à jour, ajout, retrait). Aucun contrôle d'accès ici — c'est à
// chaque action de vérifier qui parle, puis de passer la fiche concernée.

export class ErreurStage extends Error {}

/** Réponse de l'enregistrement au formulaire. */
export type EtatStage =
  { ok: true; stageId: string } | { ok: false; erreur: string } | null;

/** Une date telle que le formulaire l'envoie (champ caché « dates », en JSON). */
export type DateSaisie = {
  /** Absent pour une date ajoutée dans le formulaire. */
  id: string | null;
  /** « AAAA-MM-JJ », la valeur d'un champ date. La fin se déduit de la
   *  durée du stage : elle ne se saisit pas. */
  dateDebut: string;
  places: number | null;
  inscrits: number;
  publiee: boolean;
};

const jourMois = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function json(formData: FormData, cle: string): unknown[] {
  try {
    const valeur = JSON.parse(str(formData, cle) || "[]");
    return Array.isArray(valeur) ? valeur : [];
  } catch {
    throw new ErreurStage("Le formulaire est mal formé : rechargez la page.");
  }
}

function jour(valeur: unknown) {
  const texte = String(valeur ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null;
  const date = new Date(texte);
  return Number.isNaN(date.getTime()) ? null : date;
}

function entier(valeur: unknown) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number(valeur);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function lireDates(formData: FormData, duree: string) {
  return json(formData, "dates").map((brute) => {
    const d = (brute ?? {}) as Partial<DateSaisie>;
    const dateDebut = jour(d.dateDebut);
    if (!dateDebut) throw new ErreurStage("Chaque date doit avoir un début.");
    // La fin découle de la durée du stage, commune à toutes ses dates : un
    // changement de durée déplace donc la fin de chacune.
    const dateFin = finDuStage(dateDebut, duree);
    const quand = jourMois.format(dateDebut);
    const places = entier(d.places);
    const inscrits = entier(d.inscrits) ?? 0;
    if (Number.isNaN(places) || Number.isNaN(inscrits)) {
      throw new ErreurStage(
        `Places et inscrits du ${quand} : des nombres entiers, sans signe.`,
      );
    }
    if (places !== null && inscrits > places) {
      throw new ErreurStage(
        `Le ${quand} compte plus d'inscrits (${inscrits}) que de places (${places}).`,
      );
    }
    return {
      id: typeof d.id === "string" ? d.id : null,
      valeurs: {
        dateDebut,
        dateFin,
        places,
        inscrits,
        publiee: d.publiee !== false,
      },
    };
  });
}

/**
 * Le programme (champ caché « programme », en JSON), accordé à la durée :
 * les lignes laissées vides tombent, les moments se rangent dans l'ordre des
 * heures, un programme par jour garde les jours du stage.
 */
function lireProgrammeSaisi(formData: FormData, duree: string) {
  let brut: unknown;
  try {
    brut = JSON.parse(str(formData, "programme") || "null");
  } catch {
    throw new ErreurStage("Le formulaire est mal formé : rechargez la page.");
  }
  return accorderProgramme(lireProgramme(brut), duree);
}

/** La durée, saisie en deux champs : un nombre et une unité. */
function lireDureeSaisie(formData: FormData) {
  const nombre = Number(str(formData, "dureeNombre"));
  const unite = str(formData, "dureeUnite") as UniteDuree;
  if (!UNITES_DUREE.includes(unite)) {
    throw new ErreurStage("Choisissez l'unité de la durée.");
  }
  if (!Number.isInteger(nombre) || nombre < 1 || nombre > DUREE_MAX[unite]) {
    throw new ErreurStage(
      `La durée : un nombre entier de ${unite}s, entre 1 et ${DUREE_MAX[unite]}.`,
    );
  }
  return ecrireDuree({ nombre, unite });
}

function lireChamps(formData: FormData) {
  const titre = str(formData, "titre");
  if (!titre) throw new ErreurStage("Donnez un intitulé au stage.");
  const duree = lireDureeSaisie(formData);
  return {
    titre,
    type: optionalStr(formData, "type"),
    niveau: optionalStr(formData, "niveau"),
    duree,
    prix: optionalStr(formData, "prix"),
    description: str(formData, "description"),
    note: optionalStr(formData, "note"),
    programme: lireProgrammeSaisi(formData, duree),
  };
}

/**
 * Crée ou met à jour un stage de la fiche `transmetteurId`, avec toutes ses
 * dates et ses photos. Renvoie l'identifiant du stage.
 *
 * Un stage d'une autre fiche, ou une date d'un autre stage, ne peuvent pas
 * être visés : le stage est cherché dans cette fiche seulement, et une date
 * inconnue de ce stage est traitée comme une nouvelle.
 */
export async function enregistrerStage(
  transmetteurId: string,
  stageId: string | null,
  formData: FormData,
) {
  // Tout est lu et vérifié avant d'écrire quoi que ce soit.
  const champs = lireChamps(formData);
  const dates = lireDates(formData, champs.duree);

  const existant = stageId
    ? await db.query.stages.findFirst({
        where: and(
          eq(stages.id, stageId),
          eq(stages.transmetteurId, transmetteurId),
        ),
        with: { dates: { columns: { id: true } } },
      })
    : null;
  if (stageId && !existant) throw new ErreurStage("Ce stage est introuvable.");

  const id = existant?.id ?? randomUUID();
  const connues = new Set(existant?.dates.map((d) => d.id) ?? []);
  const maintenant = new Date();

  db.transaction((tx) => {
    if (existant) {
      tx.update(stages)
        .set({ ...champs, updatedAt: maintenant })
        .where(eq(stages.id, id))
        .run();
    } else {
      tx.insert(stages)
        .values({ id, transmetteurId, ...champs })
        .run();
    }

    const gardees = new Set<string>();
    for (const d of dates) {
      if (d.id && connues.has(d.id)) {
        tx.update(stageDates)
          .set({ ...d.valeurs, updatedAt: maintenant })
          .where(eq(stageDates.id, d.id))
          .run();
        gardees.add(d.id);
      } else {
        tx.insert(stageDates)
          .values({ id: randomUUID(), stageId: id, ...d.valeurs })
          .run();
      }
    }
    // Ce qui n'est plus dans la liste a été retiré dans le formulaire.
    for (const ancienne of connues) {
      if (!gardees.has(ancienne)) {
        tx.delete(stageDates).where(eq(stageDates.id, ancienne)).run();
      }
    }
  });

  await appliquerPhotos(id, existant?.photos ?? [], formData);
  return id;
}

/**
 * Photos d'un stage : même logique que celles de la fiche — on garde celles
 * restées cochées, on ajoute les nouvelles, on efface les fichiers retirés.
 */
async function appliquerPhotos(
  stageId: string,
  existantes: string[],
  formData: FormData,
) {
  const garder = new Set(formData.getAll("keepPhotos").map(String));
  const gardees = existantes.filter((p) => garder.has(p));
  const retirees = existantes.filter((p) => !garder.has(p));
  const nouvelles = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const ajoutees: string[] = [];
  try {
    for (const fichier of nouvelles) {
      ajoutees.push(await saveUploadedPhoto(fichier));
    }
  } catch (e) {
    // Le stage et ses dates sont enregistrés ; seule la photo fautive manque.
    await Promise.all(ajoutees.map((p) => deleteUploadedPhoto(p)));
    if (e instanceof UploadError) {
      throw new ErreurStage(
        `Stage enregistré, mais une photo a été refusée : ${e.message}`,
      );
    }
    throw e;
  }

  await Promise.all(retirees.map((p) => deleteUploadedPhoto(p)));
  await db
    .update(stages)
    .set({ photos: ordonnerPhotos(formData, gardees, ajoutees) })
    .where(eq(stages.id, stageId));
}
