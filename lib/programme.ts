import { lireDuree } from "@/lib/duree";

// Le programme d'un stage : le déroulé d'une journée, ou de chaque journée.
// Un stage de quelques heures ou d'un jour a un seul déroulé ; un stage de
// plusieurs jours a, au choix, le même programme chaque jour ou un programme
// par jour (Jour 1, Jour 2…). Les heures se choisissent dans une liste et
// s'enregistrent au format « 09:30 ».

/** Un moment de la journée. Sans heure : un moment qu'on ne cale pas. */
export type Moment = { heure: string | null; titre: string };

export type Programme =
  | { type: "journee"; moments: Moment[] }
  | { type: "par-jour"; jours: Moment[][] };

/** Ce qu'un stage enregistré avant les programmes par jour contient encore. */
type MomentAncien = { heure: string; titre: string };

/** Ce que la colonne peut contenir : le format actuel, ou l'ancien tableau. */
export type ProgrammeStocke = Programme | MomentAncien[];

export const PROGRAMME_VIDE: Programme = { type: "journee", moments: [] };

/** Au-delà, un programme jour par jour n'a plus de sens : une journée type. */
export const JOURS_PAR_JOUR_MAX = 14;

/** Les heures proposées, de 5 h à 23 h, et les minutes, au quart d'heure. */
export const HEURES = Array.from({ length: 19 }, (_, i) =>
  String(i + 5).padStart(2, "0"),
);
export const MINUTES = ["00", "15", "30", "45"];

const FORMAT_HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** « 09:30 » → « 9 h 30 », « 07:00 » → « 7 h ». */
export function heureLisible(heure: string) {
  const m = heure.match(FORMAT_HEURE);
  if (!m) return heure;
  const h = Number(m[1]);
  return m[2] === "00" ? `${h} h` : `${h} h ${m[2]}`;
}

/** Relit une heure d'avant, écrite à la main : « 7 h », « 9h30 », « 14:15 ». */
function heureAncienne(texte: string) {
  const m = texte.trim().match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function lireMoment(brut: unknown): Moment | null {
  const m = (brut ?? {}) as { heure?: unknown; titre?: unknown };
  let titre = String(m.titre ?? "").trim();
  const texte = typeof m.heure === "string" ? m.heure.trim() : "";
  let heure: string | null = null;
  if (FORMAT_HEURE.test(texte)) heure = texte;
  else if (texte) {
    heure = heureAncienne(texte);
    // Une heure d'avant qu'on ne sait pas relire (« Matin ») reste lisible.
    if (!heure) titre = titre ? `${texte} — ${titre}` : texte;
  }
  return titre ? { heure, titre } : null;
}

function lireMoments(brut: unknown): Moment[] {
  if (!Array.isArray(brut)) return [];
  return brut.map(lireMoment).filter((m): m is Moment => m !== null);
}

/**
 * Le programme d'un stage, quelle que soit la forme sous laquelle il a été
 * enregistré. Les moments sans intitulé sont écartés.
 */
export function lireProgramme(brut: unknown): Programme {
  // L'ancien format : une seule journée, en tableau.
  if (Array.isArray(brut))
    return { type: "journee", moments: lireMoments(brut) };
  const p = (brut ?? {}) as {
    type?: unknown;
    moments?: unknown;
    jours?: unknown;
  };
  if (p.type === "par-jour" && Array.isArray(p.jours)) {
    return { type: "par-jour", jours: p.jours.map(lireMoments) };
  }
  return { type: "journee", moments: lireMoments(p.moments) };
}

/**
 * Combien de jours peuvent avoir chacun leur programme : le nombre de jours
 * du stage, s'il en compte plusieurs (jusqu'à deux semaines). Zéro : un seul
 * déroulé possible.
 */
export function joursProgrammables(duree: string | null | undefined) {
  const d = lireDuree(duree);
  if (!d || d.unite === "heure") return 0;
  const jours = d.unite === "semaine" ? d.nombre * 7 : d.nombre;
  return jours >= 2 && jours <= JOURS_PAR_JOUR_MAX ? jours : 0;
}

/**
 * Les moments dans l'ordre des heures. Un moment sans heure garde sa place
 * derrière celui qui le précède : on ne le déplace pas au hasard.
 */
export function rangerMoments(moments: Moment[]): Moment[] {
  const groupes: { heure: string; moments: Moment[] }[] = [];
  for (const m of moments) {
    const dernier = groupes.at(-1);
    if (m.heure || !dernier) {
      groupes.push({ heure: m.heure ?? "", moments: [m] });
    } else {
      dernier.moments.push(m);
    }
  }
  // Tri stable : deux moments à la même heure restent dans l'ordre saisi.
  return groupes
    .map((g, i) => ({ ...g, i }))
    .sort((a, b) => a.heure.localeCompare(b.heure) || a.i - b.i)
    .flatMap((g) => g.moments);
}

/**
 * Le programme tel qu'il s'enregistre, accordé à la durée du stage : un
 * programme par jour n'a que les jours du stage, et redevient une seule
 * journée si le stage n'en compte plus plusieurs.
 */
export function accorderProgramme(
  programme: Programme,
  duree: string | null | undefined,
): Programme {
  const jours = joursProgrammables(duree);
  if (programme.type === "par-jour") {
    if (jours === 0) {
      return {
        type: "journee",
        moments: rangerMoments(programme.jours[0] ?? []),
      };
    }
    const parJour = Array.from({ length: jours }, (_, i) =>
      rangerMoments(programme.jours[i] ?? []),
    );
    return parJour.every((j) => j.length === 0)
      ? PROGRAMME_VIDE
      : { type: "par-jour", jours: parJour };
  }
  return { type: "journee", moments: rangerMoments(programme.moments) };
}

/** Rien à afficher ? */
export function programmeVide(p: Programme) {
  return p.type === "journee"
    ? p.moments.length === 0
    : p.jours.every((j) => j.length === 0);
}
