"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import type { EtatFiche } from "@/lib/etat-fiche";
import { bouton, grand } from "@/lib/style";

// La barre fixée au bas de l'écran pendant l'édition d'une fiche. C'est la
// même dans chaque onglet — Fiche, Stages, Témoignages, Administration : à
// gauche l'état de la fiche dans sa couleur, et pour l'association la case
// « Fiche visible sur le site » ; à droite la fiche publique et
// « Enregistrer », qui enregistre ce qu'on modifie dans l'onglet ouvert.

export type InfosBarre = {
  etat: EtatFiche;
  lienPublic?: string;
  publiee: boolean;
  /** Réglages de l'association : absents de l'espace transmetteur. */
  publication?: {
    /** Coche ou décoche la visibilité, tout de suite ; renvoie un refus éventuel. */
    changerVisibilite: (visible: boolean) => Promise<string | null>;
    /**
     * Jamais validée, ou bloquée : la case reste en retrait. Avant la
     * première validation, c'est le bouton « Publier la fiche » qui la coche.
     */
    caseVerrouillee: boolean;
    /** Complète et jamais publiée : le bouton « Publier la fiche » s'affiche. */
    premiereMiseEnLigne: boolean;
  };
};

const Contexte = createContext<InfosBarre | null>(null);

/** Posé par les onglets d'édition : l'état de la fiche, commun à tous. */
export const FournisseurBarre = Contexte.Provider;

export function BarreEnregistrement({
  modifie = false,
  enCours = false,
  erreur,
  info,
  enregistrer,
}: {
  modifie?: boolean;
  enCours?: boolean;
  erreur?: string | null;
  info?: string | null;
  /**
   * Le bouton « Enregistrer » : le formulaire qu'il envoie (par défaut celui
   * où la barre est posée) et son libellé. Absent : l'onglet n'a rien à
   * enregistrer, le bouton reste en retrait.
   */
  enregistrer?: { form?: string; libelle?: string };
}) {
  const infos = useContext(Contexte);
  const etat = infos?.etat;
  const publication = infos?.publication;
  const publiee = infos?.publiee ?? false;

  // La visibilité agit tout de suite : son propre envoi, son propre refus.
  const [visibiliteEnCours, demarrer] = useTransition();
  const [cible, setCible] = useState<boolean | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const [confirmerRetrait, setConfirmerRetrait] = useState(false);

  function rendreVisible(visible: boolean) {
    if (!publication) return;
    setRefus(null);
    setCible(visible);
    demarrer(async () => {
      setRefus(await publication.changerVisibilite(visible));
      setCible(null);
    });
  }

  const actif = Boolean(enregistrer) && modifie && !enCours;
  const publier = publication?.premiereMiseEnLigne && !publiee;
  const coche = cible ?? publiee;

  return (
    <>
      <div
        style={
          etat
            ? {
                borderTopColor: `var(--statut-${etat.teinte})`,
                backgroundColor: `var(--statut-${etat.teinte}-fond)`,
              }
            : undefined
        }
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-border bg-background/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-8">
          <div className="text-sm">
            {etat && (
              <div
                style={{ color: `var(--statut-${etat.teinte})` }}
                className="font-semibold"
              >
                {etat.titre}
              </div>
            )}
            {publication && (
              <label
                className={`mt-1 flex items-center gap-2.5 ${
                  publication.caseVerrouillee
                    ? "cursor-not-allowed opacity-45"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={coche}
                  disabled={publication.caseVerrouillee || visibiliteEnCours}
                  onChange={(e) =>
                    e.target.checked
                      ? rendreVisible(true)
                      : setConfirmerRetrait(true)
                  }
                />
                <span>Fiche visible sur le site</span>
              </label>
            )}
            {etat && (
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {etat.detail}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {infos?.lienPublic && (
              <a
                href={infos.lienPublic}
                target="_blank"
                rel="noopener"
                className="text-sm font-medium underline underline-offset-2"
              >
                {publiee ? "Voir la fiche publique ↗" : "Aperçu public ↗"}
              </a>
            )}
            {modifie && !enCours && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--statut-a-valider)]">
                <span aria-hidden className="h-2 w-2 bg-current" />
                Modifications non enregistrées
              </span>
            )}
            {(erreur || refus) && (
              <p role="alert" className="max-w-md text-sm text-destructive">
                {erreur ?? refus}
              </p>
            )}
            {info && !modifie && !erreur && (
              <p role="status" className="max-w-md text-sm text-success-foreground">
                {info}
              </p>
            )}
            {publier && (
              <button
                type="button"
                onClick={() => rendreVisible(true)}
                disabled={visibiliteEnCours}
                className={`${bouton.primaire} ${grand}`}
              >
                {visibiliteEnCours ? "Publication…" : "Publier la fiche"}
              </button>
            )}
            {/* Rien à enregistrer : le bouton reste en retrait. */}
            <button
              type="submit"
              form={enregistrer?.form}
              disabled={!actif}
              // « Publier » présent : « Enregistrer » passe au second plan.
              className={`${publier ? bouton.secondaire : bouton.primaire} ${grand} disabled:opacity-35`}
            >
              {enCours
                ? "Enregistrement…"
                : (enregistrer?.libelle ?? "Enregistrer")}
            </button>
          </div>
        </div>
      </div>

      {/* Hors de la barre : son flou d'arrière-plan servirait sinon de cadre
          à la fenêtre, au lieu de l'écran entier. */}
      {confirmerRetrait && (
        <ModaleConfirmation
          titre="Retirer la fiche du site ?"
          onClose={() => setConfirmerRetrait(false)}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            Elle ne sera plus visible du public. Vous pourrez la remettre en
            ligne en recochant la case.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmerRetrait(false)}
              className={bouton.secondaire}
            >
              Laisser en ligne
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmerRetrait(false);
                rendreVisible(false);
              }}
              className={bouton.danger}
            >
              Retirer du site
            </button>
          </div>
        </ModaleConfirmation>
      )}
    </>
  );
}
