import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { stageDates, transmetteurs } from "@/lib/db/schema";
import type { TransmetteurPoint } from "@/components/map/types";

// The set of "formes de transmission" a transmetteur offers isn't stored on
// their profile — it's the union of the (free-text) `type` of each of their
// stages, since one transmetteur can run several different kinds of stages.
function formesProposees(stages: { type: string | null }[]) {
  return [...new Set(stages.map((s) => s.type).filter((t) => t !== null))];
}

export async function getPublishedTransmetteurs(): Promise<
  TransmetteurPoint[]
> {
  const rows = await db.query.transmetteurs.findMany({
    where: eq(transmetteurs.publiee, true),
    with: {
      stages: { columns: { type: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    nom: t.nom,
    domaine: t.domaine,
    savoirFaire: t.savoirFaire,
    photo: t.photos[0] ?? null,
    lieuApproximatif: t.lieuApproximatif,
    lat: t.lat,
    lng: t.lng,
    hebergement: t.hebergement,
    types: formesProposees(t.stages),
  }));
}

export type UpcomingStage = {
  /** Identifiant de la date. */
  id: string;
  /** Identifiant du stage parent — sert d'ancre vers la fiche. */
  stageId: string;
  titre: string;
  type: string | null;
  niveau: string | null;
  prix: string | null;
  description: string;
  /** Photo du stage, à défaut celle de la fiche. */
  photo: string | null;
  dateDebut: Date;
  dateFin: Date;
  places: number | null;
  inscrits: number;
  transmetteur: TransmetteurPoint;
};

export async function getUpcomingStages(): Promise<UpcomingStage[]> {
  const rows = await db.query.stageDates.findMany({
    where: and(gte(stageDates.dateFin, new Date()), eq(stageDates.publiee, true)),
    orderBy: (d, { asc }) => [asc(d.dateDebut)],
    with: {
      stage: {
        with: {
          transmetteur: {
            with: { stages: { columns: { type: true } } },
          },
        },
      },
    },
  });

  return rows
    .filter((d) => d.stage.transmetteur.publiee)
    .map((d) => ({
      id: d.id,
      stageId: d.stage.id,
      titre: d.stage.titre,
      type: d.stage.type,
      niveau: d.stage.niveau,
      prix: d.stage.prix,
      description: d.stage.description,
      photo: d.stage.photos[0] ?? d.stage.transmetteur.photos[0] ?? null,
      dateDebut: d.dateDebut,
      dateFin: d.dateFin,
      places: d.places,
      inscrits: d.inscrits,
      transmetteur: {
        id: d.stage.transmetteur.id,
        slug: d.stage.transmetteur.slug,
        nom: d.stage.transmetteur.nom,
        domaine: d.stage.transmetteur.domaine,
        savoirFaire: d.stage.transmetteur.savoirFaire,
        photo: d.stage.transmetteur.photos[0] ?? null,
        lieuApproximatif: d.stage.transmetteur.lieuApproximatif,
        lat: d.stage.transmetteur.lat,
        lng: d.stage.transmetteur.lng,
        hebergement: d.stage.transmetteur.hebergement,
        types: formesProposees(d.stage.transmetteur.stages),
      },
    }));
}
