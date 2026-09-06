import { DOMAINES, type Domaine } from "@/lib/db/schema";

export const DOMAINE_LABELS: Record<Domaine, string> = {
  habitat: "Habitat",
  artisanat: "Artisanat",
  alimentation: "Alimentation",
  jardin_nature: "Jardin & nature",
};

export const DOMAINE_EXEMPLES: Record<Domaine, string> = {
  habitat: "Charpente, pierre sèche, enduits terre, chaux, menuiserie…",
  artisanat: "Forge, coutellerie, vannerie, poterie, cuir, tournage…",
  alimentation: "Pain au levain, meunerie, fromage, brasserie, conserverie…",
  jardin_nature: "Maraîchage, permaculture, semences, greffe, apiculture…",
};

// Niveau et forme de transmission vivent uniquement au niveau d'un stage
// (un même transmetteur peut proposer plusieurs types de stages, à des
// niveaux différents) — ces listes alimentent les <select> du formulaire de
// stage, et servent aussi de vocabulaire commun pour les filtres carte/annuaire.
export const TYPES_TRANSMISSION = [
  "Stage payant",
  "Chantier participatif",
  "Échange de savoir-faire",
  "Aide bénévole",
  "Portes ouvertes",
] as const;

export const NIVEAUX_STAGE = [
  "Débutant bienvenu",
  "Quelques bases utiles",
  "Intermédiaire",
  "Confirmé",
  "Tout public",
] as const;

export { DOMAINES };
