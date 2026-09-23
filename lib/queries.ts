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

/** Fiche placée sur la carte — les coordonnées sont nulles tant qu'elle est
 *  en cours de remplissage. */
function estSituee<T extends { lat: number | null; lng: number | null }>(
  t: T
): t is T & { lat: number; lng: number } {
  return t.lat !== null && t.lng !== null;
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

  // Une fiche publiée est forcément complète (la publication l'exige) ; ce
  // filtre ne fait que le prouver au typage, et protège la carte au cas où.
  return rows.filter(estSituee).map((t) => ({
    id: t.id,
    slug: t.slug,
    nom: t.nom,
    domaine: t.domaine,
    savoirFaire: t.savoirFaire ?? "",
    photo: t.photos[0] ?? null,
    lieuApproximatif: t.lieuApproximatif ?? "",
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

  // flatMap plutôt que filter + map : c'est ce qui permet au typage de voir
  // que les coordonnées du transmetteur retenu ne sont plus nulles.
  return rows.flatMap((d) => {
    const t = d.stage.transmetteur;
    if (!t.publiee || !estSituee(t)) return [];
    return [
      {
        id: d.id,
        stageId: d.stage.id,
        titre: d.stage.titre,
        type: d.stage.type,
        niveau: d.stage.niveau,
        prix: d.stage.prix,
        description: d.stage.description,
        photo: d.stage.photos[0] ?? t.photos[0] ?? null,
        dateDebut: d.dateDebut,
        dateFin: d.dateFin,
        places: d.places,
        inscrits: d.inscrits,
        transmetteur: {
          id: t.id,
          slug: t.slug,
          nom: t.nom,
          domaine: t.domaine,
          savoirFaire: t.savoirFaire ?? "",
          photo: t.photos[0] ?? null,
          lieuApproximatif: t.lieuApproximatif ?? "",
          lat: t.lat,
          lng: t.lng,
          hebergement: t.hebergement,
          types: formesProposees(t.stages),
        },
      },
    ];
  });
}
