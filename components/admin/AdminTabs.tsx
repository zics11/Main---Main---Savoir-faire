"use client";

import { useState } from "react";

type OngletId = "fiche" | "stages" | "temoignages";

// Les trois panneaux restent montés (simplement masqués) : passer d'un
// onglet à l'autre ne doit pas faire perdre ce qui a été saisi dans les
// formulaires d'un autre onglet.
export function AdminTabs({
  nbStages,
  nbTemoignages,
  fiche,
  stages,
  temoignages,
}: {
  nbStages: number;
  nbTemoignages: number;
  fiche: React.ReactNode;
  stages: React.ReactNode;
  temoignages: React.ReactNode;
}) {
  const [actif, setActif] = useState<OngletId>("fiche");

  const onglets: { id: OngletId; label: string; compte?: number }[] = [
    { id: "fiche", label: "Fiche" },
    { id: "stages", label: "Stages", compte: nbStages },
    { id: "temoignages", label: "Témoignages", compte: nbTemoignages },
  ];

  return (
    <div>
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {onglets.map((o) => {
          const on = actif === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActif(o.id)}
              className={`rounded-sm border px-5 py-2.5 text-sm font-semibold ${
                on
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
      <div role="tabpanel" hidden={actif !== "temoignages"}>
        {temoignages}
      </div>
    </div>
  );
}
