"use client";

import { useCallback, useState } from "react";
import {
  BarreEnregistrement,
  FournisseurBarre,
  type InfosBarre,
} from "./BarreEnregistrement";
import { FournisseurModifications } from "./ModificationsEnCours";

type OngletId = "fiche" | "stages" | "temoignages" | "administration";

// Onglets d'édition d'une fiche, dans l'admin comme dans l'espace
// transmetteur (sans témoignages : ils restent gérés par l'association).
// Les panneaux restent montés (simplement masqués) : passer d'un onglet à
// l'autre ne doit pas faire perdre ce qui a été saisi dans un autre.
export function FicheTabs({
  barre,
  nbStages,
  nbTemoignages,
  fiche,
  stages,
  temoignages,
  administration,
}: {
  /** L'état de la fiche, affiché dans la barre du bas de chaque onglet. */
  barre: InfosBarre;
  nbStages: number;
  nbTemoignages?: number;
  fiche: React.ReactNode;
  stages: React.ReactNode;
  temoignages?: React.ReactNode;
  /** Réglages réservés à l'association : absent de l'espace transmetteur. */
  administration?: React.ReactNode;
}) {
  const [actif, setActif] = useState<OngletId>("fiche");
  // Onglets dont un formulaire attend d'être enregistré : la barre du bas
  // disparaît avec l'onglet qu'on quitte, la marque sur l'onglet la remplace.
  const [enAttente, setEnAttente] = useState<Record<string, boolean>>({});
  const signaler = useCallback(
    (zone: string, modifie: boolean) =>
      setEnAttente((avant) =>
        avant[zone] === modifie ? avant : { ...avant, [zone]: modifie },
      ),
    [],
  );

  const onglets: { id: OngletId; label: string; compte?: number }[] = [
    { id: "fiche", label: "Fiche" },
    { id: "stages", label: "Stages", compte: nbStages },
    ...(temoignages
      ? [
          {
            id: "temoignages" as const,
            label: "Témoignages",
            compte: nbTemoignages,
          },
        ]
      : []),
    ...(administration
      ? [{ id: "administration" as const, label: "Administration" }]
      : []),
  ];

  return (
    <FournisseurBarre value={barre}>
      <FournisseurModifications value={signaler}>
        <div role="tablist" className="mb-6 flex flex-wrap gap-2">
          {onglets.map((o) => {
            const on = actif === o.id;
            // L'onglet des réglages de l'association porte sa propre couleur :
            // ce qu'on y fait n'est pas du même ordre que le reste.
            const admin = o.id === "administration";
            return (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActif(o.id)}
                style={
                  admin
                    ? on
                      ? {
                          backgroundColor: "var(--admin)",
                          borderColor: "var(--admin)",
                          color: "#fff",
                        }
                      : {
                          borderColor: "var(--admin-bord)",
                          color: "var(--admin)",
                        }
                    : undefined
                }
                className={`rounded-sm border px-5 py-2.5 text-sm font-semibold ${
                  admin
                    ? "bg-[var(--admin-fond)]"
                    : on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                {o.label}
                {o.compte !== undefined && (
                  <span className="ml-1.5 opacity-70">{o.compte}</span>
                )}
                {enAttente[o.id] && (
                  <span
                    title="Modifications non enregistrées"
                    className="ml-2 inline-block h-2 w-2 bg-[var(--statut-a-valider)] align-middle"
                  >
                    <span className="sr-only">
                      {" "}
                      — modifications non enregistrées
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" hidden={actif !== "fiche"}>
          {fiche}
        </div>
        <div role="tabpanel" hidden={actif !== "stages"}>
          {stages}
        </div>
        {temoignages && (
          <div role="tabpanel" hidden={actif !== "temoignages"}>
            {temoignages}
          </div>
        )}
        {administration && (
          <div role="tabpanel" hidden={actif !== "administration"}>
            {administration}
            {/* Rien ne s'y enregistre en bloc — chaque réglage agit tout de
              suite — mais la barre reste la même que partout. */}
            <BarreEnregistrement />
          </div>
        )}
      </FournisseurModifications>
    </FournisseurBarre>
  );
}
