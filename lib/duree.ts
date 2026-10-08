// La durée d'un stage se saisit une fois, sur le stage : un nombre et une
// unité. Elle s'affiche telle quelle (« 2 jours ») et donne la fin de chaque
// date — qu'on n'a donc plus à saisir.

export const UNITES_DUREE = ["heure", "jour", "semaine"] as const;
export type UniteDuree = (typeof UNITES_DUREE)[number];

export type Duree = { nombre: number; unite: UniteDuree };

/** Plus que ça n'a plus rien d'un stage : on s'arrête là. */
export const DUREE_MAX: Record<UniteDuree, number> = {
  heure: 24,
  jour: 60,
  semaine: 12,
};

/** « 1 jour », « 2 jours », « 8 heures ». */
export function ecrireDuree({ nombre, unite }: Duree) {
  return `${nombre} ${unite}${nombre > 1 ? "s" : ""}`;
}

/** Relit une durée écrite par `ecrireDuree` ; null pour un texte libre d'avant. */
export function lireDuree(texte: string | null | undefined): Duree | null {
  const m = texte?.trim().match(/^(\d+)\s*(heure|jour|semaine)s?$/i);
  if (!m) return null;
  return {
    nombre: Number(m[1]),
    unite: m[2].toLowerCase() as UniteDuree,
  };
}

/**
 * Nombre de jours de calendrier qu'occupe une date du stage : quelques heures
 * tiennent dans la journée, une semaine en prend sept. Une durée illisible
 * compte pour une journée.
 */
export function joursDeDuree(texte: string | null | undefined) {
  const d = lireDuree(texte);
  if (!d) return 1;
  if (d.unite === "heure") return 1;
  return d.unite === "semaine" ? d.nombre * 7 : d.nombre;
}

/** Dernier jour d'un stage qui commence le `debut` (dates à minuit UTC). */
export function finDuStage(debut: Date, duree: string | null | undefined) {
  return new Date(debut.getTime() + (joursDeDuree(duree) - 1) * 86_400_000);
}
