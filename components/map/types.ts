import type { Domaine } from "@/lib/db/schema";

/** Cadrage courant de la carte, pour n'afficher que ce qui est à l'écran. */
export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function dansLeCadrage(
  p: { lat: number; lng: number },
  b: MapBounds
): boolean {
  if (p.lat < b.south || p.lat > b.north) return false;
  // west > east quand le cadrage franchit l'antiméridien
  return b.west <= b.east
    ? p.lng >= b.west && p.lng <= b.east
    : p.lng >= b.west || p.lng <= b.east;
}

export type TransmetteurPoint = {
  id: string;
  slug: string;
  nom: string;
  domaine: Domaine;
  savoirFaire: string;
  /** Première photo de la fiche, affichée en vignette dans les résumés. */
  photo: string | null;
  lieuApproximatif: string;
  lat: number;
  lng: number;
  hebergement: boolean;
  types: string[];
};
