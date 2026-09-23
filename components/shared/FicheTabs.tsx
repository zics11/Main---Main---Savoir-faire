"use client";

import { useState } from "react";

type OngletId = "fiche" | "stages" | "temoignages" | "administration";

// Onglets d'édition d'une fiche, dans l'admin comme dans l'espace
// transmetteur (sans témoignages : ils restent gérés par l'association).
// Les panneaux restent montés (simplement masqués) : passer d'un onglet à
// l'autre ne doit pas faire perdre ce qui a été saisi dans un autre.
export function FicheTabs({
  nbStages,
  nbTemoignages,
  fiche,
  stages,
  temoignages,
  administration,
}: {
  nbStages: number;
  nbTemoignages?: number;
  fiche: React.ReactNode;
  stages: React.ReactNode;
  temoignages?: React.ReactNode;
  /** Réglages réservés à l'association : absent de l'espace transmetteur. */
  administration?: React.ReactNode;
}) {
  const [actif, setActif] = useState<OngletId>("fiche");

  const onglets: { id: OngletId; label: string; compte?: number }[] = [
    { id: "fiche", label: "Fiche" },
    { id: "stages", label: "Stages", compte: nbStages },
    ...(temoignages
      ? [{ id: "temoignages" as const, label: "Témoignages", compte: nbTemoignages }]
      : []),
    ...(administration
      ? [{ id: "administration" as const, label: "Administration" }]
      : []),
  ];

  return (
    <div>
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
                    : { borderColor: "var(--admin-bord)", color: "var(--admin)" }
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
        </div>
      )}
    </div>
  );
}
