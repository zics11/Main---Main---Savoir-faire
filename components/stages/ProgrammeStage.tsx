"use client";

import { useState } from "react";
import { CopyIcon, XIcon } from "lucide-react";
import {
  HEURES,
  joursProgrammables,
  lireProgramme,
  MINUTES,
  type Moment,
  type Programme,
  type ProgrammeStocke,
} from "@/lib/programme";
import { cadreChamp, champ } from "@/lib/style";
import { cn } from "@/lib/utils";
import { BoutonAjout } from "./BoutonAjout";

// La saisie du programme d'un stage. Un seul déroulé pour un stage de
// quelques heures ou d'un jour ; au-delà, le choix entre une journée type et
// un programme par jour. Les heures se choisissent, elles ne s'écrivent pas.

/** Les lignes ajoutées n'ont pas d'identifiant : `cle` sert à React seulement. */
type LigneMoment = { cle: string; heure: string; titre: string };

/**
 * Le programme en cours d'édition. Les deux versions sont gardées : passer
 * d'« même programme » à « un par jour » et revenir ne perd rien. Seule
 * celle qui est choisie s'enregistre.
 */
export type BrouillonProgramme = {
  parJour: boolean;
  commun: LigneMoment[];
  jours: LigneMoment[][];
};

let compteur = 0;
const nouvelleCle = () => `moment-${++compteur}`;

const ligneVide = (): LigneMoment => ({
  cle: nouvelleCle(),
  heure: "",
  titre: "",
});

const versLignes = (moments: Moment[]) =>
  moments.map((m) => ({
    cle: nouvelleCle(),
    heure: m.heure ?? "",
    titre: m.titre,
  }));

/** Une copie avec de nouvelles clés : reprendre un jour dans un autre. */
const copier = (lignes: LigneMoment[]) =>
  lignes.map((l) => ({ ...l, cle: nouvelleCle() }));

const estVide = (lignes: LigneMoment[]) =>
  lignes.every((l) => !l.heure && !l.titre.trim());

/** Le brouillon d'un stage existant, ou d'un stage neuf (une ligne à remplir). */
export function brouillonProgramme(
  stocke: ProgrammeStocke | null,
): BrouillonProgramme {
  if (!stocke) return { parJour: false, commun: [ligneVide()], jours: [] };
  const p = lireProgramme(stocke);
  // Un programme par jour garde son jour 1 comme journée type : c'est elle
  // qui sert si l'on revient au même programme chaque jour.
  return p.type === "par-jour"
    ? {
        parJour: true,
        commun: versLignes(p.jours[0] ?? []),
        jours: p.jours.map(versLignes),
      }
    : { parJour: false, commun: versLignes(p.moments), jours: [] };
}

/**
 * La journée unique, quand il n'y en a qu'une à programmer. Un stage passé
 * de plusieurs jours à un seul, sans journée type écrite, garde son jour 1 :
 * rien ne disparaît en changeant la durée.
 */
function journeeUnique(b: BrouillonProgramme, nbJours: number) {
  return b.parJour && nbJours === 0 && estVide(b.commun)
    ? (b.jours[0] ?? [])
    : b.commun;
}

function versMoments(lignes: LigneMoment[]): Moment[] {
  return lignes
    .map((l) => ({ heure: l.heure || null, titre: l.titre.trim() }))
    .filter((m) => m.titre !== "" || m.heure !== null);
}

/** Ce qui s'envoie (champ caché « programme ») et sert à repérer un changement. */
export function programmeSaisi(
  b: BrouillonProgramme,
  duree: string,
): Programme {
  const jours = joursProgrammables(duree);
  if (b.parJour && jours > 0) {
    return {
      type: "par-jour",
      jours: Array.from({ length: jours }, (_, i) =>
        versMoments(b.jours[i] ?? []),
      ),
    };
  }
  return { type: "journee", moments: versMoments(journeeUnique(b, jours)) };
}

/** Deux listes : l'heure, puis les minutes au quart d'heure. */
function ChoixHeure({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (heure: string) => void;
}) {
  const [h, m] = valeur ? valeur.split(":") : ["", ""];
  // Une heure d'avant hors de la liste (4 h, 9 h 20…) y reste proposée.
  const heures = h && !HEURES.includes(h) ? [h, ...HEURES].sort() : HEURES;
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;
  return (
    <div className="flex shrink-0 gap-1">
      <select
        value={h}
        onChange={(e) =>
          onChange(e.target.value ? `${e.target.value}:${m || "00"}` : "")
        }
        aria-label="Heure"
        className={cn(cadreChamp, "w-[4.75rem] px-2")}
      >
        <option value="">—</option>
        {heures.map((x) => (
          <option key={x} value={x}>
            {Number(x)} h
          </option>
        ))}
      </select>
      <select
        value={m || "00"}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        disabled={!h}
        aria-label="Minutes"
        className={cn(cadreChamp, "w-[4.25rem] px-2 disabled:opacity-50")}
      >
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Les moments d'une journée, un par ligne. */
function ListeMoments({
  lignes,
  onChange,
}: {
  lignes: LigneMoment[];
  onChange: (lignes: LigneMoment[]) => void;
}) {
  const changer = (cle: string, modif: Partial<LigneMoment>) =>
    onChange(lignes.map((l) => (l.cle === cle ? { ...l, ...modif } : l)));
  return (
    <>
      <ul className="flex flex-col gap-2">
        {lignes.map((l) => (
          <li key={l.cle} className="flex flex-wrap items-center gap-2">
            <ChoixHeure
              valeur={l.heure}
              onChange={(heure) => changer(l.cle, { heure })}
            />
            <div className="flex min-w-[12rem] flex-1 items-center gap-2">
              <input
                value={l.titre}
                onChange={(e) => changer(l.cle, { titre: e.target.value })}
                placeholder="ex : Pétrissage à la main"
                aria-label="Ce qu'on fait"
                className={`${champ} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => onChange(lignes.filter((x) => x.cle !== l.cle))}
                aria-label="Retirer ce moment"
                title="Retirer ce moment"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <XIcon aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <BoutonAjout onClick={() => onChange([...lignes, ligneVide()])}>
        Ajouter un moment
      </BoutonAjout>
    </>
  );
}

/**
 * L'éditeur : le choix de la forme du programme (pour un stage de plusieurs
 * jours), puis les moments — de la journée, ou du jour choisi.
 */
export function EditeurProgramme({
  valeur: b,
  onChange,
  duree,
}: {
  valeur: BrouillonProgramme;
  onChange: (b: BrouillonProgramme) => void;
  /** La durée saisie, « 3 jours » : elle dit combien de jours programmer. */
  duree: string;
}) {
  const nbJours = joursProgrammables(duree);
  const [jourChoisi, setJourChoisi] = useState(0);
  const jour = Math.min(jourChoisi, Math.max(nbJours - 1, 0));
  const parJour = b.parJour && nbJours > 0;

  function choisirParJour(oui: boolean) {
    if (oui === b.parJour) return;
    if (oui) {
      // La journée type déjà écrite devient le jour 1 : on part de là.
      const jours =
        b.jours.length > 0 && !b.jours.every(estVide)
          ? b.jours
          : [estVide(b.commun) ? [ligneVide()] : copier(b.commun)];
      onChange({ ...b, parJour: true, jours });
      setJourChoisi(0);
    } else {
      const commun =
        estVide(b.commun) && b.jours[0] && !estVide(b.jours[0])
          ? copier(b.jours[0])
          : b.commun.length > 0
            ? b.commun
            : [ligneVide()];
      onChange({ ...b, parJour: false, commun });
    }
  }

  const changerJour = (i: number, lignes: LigneMoment[]) => {
    const jours = Array.from(
      { length: Math.max(b.jours.length, i + 1) },
      (_, k) => b.jours[k] ?? [],
    );
    jours[i] = lignes;
    onChange({ ...b, jours });
  };

  const lignesDuJour = b.jours[jour] ?? [];

  return (
    <div className="flex flex-col gap-4">
      {nbJours > 0 && (
        <div
          role="radiogroup"
          aria-label="Forme du programme"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {[
            {
              oui: false,
              titre: "Le même programme chaque jour",
              detail: "Une journée type, valable pour tous les jours.",
            },
            {
              oui: true,
              titre: "Un programme par jour",
              detail: `Jour 1, jour 2… jusqu'au jour ${nbJours}.`,
            },
          ].map((o) => {
            const on = parJour === o.oui;
            return (
              <button
                key={o.titre}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choisirParJour(o.oui)}
                className={`flex items-start gap-3 rounded-sm border px-4 py-3 text-left ${
                  on
                    ? "border-primary bg-accent"
                    : "border-input bg-card hover:bg-accent/50"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    on ? "border-primary" : "border-input"
                  }`}
                >
                  {on && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-medium">{o.titre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {o.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {parJour ? (
        <div>
          <div
            role="tablist"
            aria-label="Jour du programme"
            className="mb-4 flex flex-wrap gap-1.5"
          >
            {Array.from({ length: nbJours }, (_, i) => {
              const on = i === jour;
              const rempli = !estVide(b.jours[i] ?? []);
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setJourChoisi(i)}
                  // Un jour encore vide se repère d'un coup d'œil : bord en
                  // pointillés, texte effacé.
                  className={`rounded-sm border px-3 py-1.5 text-sm font-medium ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : rempli
                        ? "border-input bg-card text-foreground/80 hover:bg-accent"
                        : "border-dashed border-input bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Jour {i + 1}
                </button>
              );
            })}
          </div>

          {estVide(lignesDuJour) &&
            jour > 0 &&
            !estVide(b.jours[jour - 1] ?? []) && (
              <button
                type="button"
                onClick={() => changerJour(jour, copier(b.jours[jour - 1]))}
                className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <CopyIcon aria-hidden className="h-4 w-4" />
                Reprendre le programme du jour {jour}
              </button>
            )}
          <ListeMoments
            key={jour}
            lignes={lignesDuJour.length > 0 ? lignesDuJour : [ligneVide()]}
            onChange={(lignes) => changerJour(jour, lignes)}
          />
        </div>
      ) : (
        <ListeMoments
          lignes={journeeUnique(b, nbJours)}
          // Ce qui s'écrit ici devient la journée type, pour de bon.
          onChange={(commun) => onChange({ ...b, parJour: false, commun })}
        />
      )}
    </div>
  );
}
