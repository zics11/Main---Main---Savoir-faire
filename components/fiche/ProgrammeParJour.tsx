"use client";

import { useId, useState } from "react";
import type { Moment } from "@/lib/programme";
import { FriseProgramme } from "./FriseProgramme";

/**
 * Un programme jour par jour, en onglets : Jour 1, Jour 2… Un jour sans
 * programme n'a pas d'onglet, mais les autres gardent leur numéro.
 */
export function ProgrammeParJour({ jours }: { jours: Moment[][] }) {
  const remplis = jours
    .map((moments, i) => ({ numero: i + 1, moments }))
    .filter((j) => j.moments.length > 0);
  const [choisi, setChoisi] = useState(0);
  const id = useId();
  const jour = remplis[Math.min(choisi, remplis.length - 1)];
  if (!jour) return null;

  return (
    <div>
      {remplis.length > 1 && (
        <div
          role="tablist"
          aria-label="Jour du programme"
          className="mb-4 flex flex-wrap gap-1.5"
        >
          {remplis.map((j, i) => {
            const on = j === jour;
            return (
              <button
                key={j.numero}
                id={`${id}-onglet-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${id}-jour`}
                onClick={() => setChoisi(i)}
                className={`rounded-sm border px-3 py-1.5 text-sm font-medium ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                Jour {j.numero}
              </button>
            );
          })}
        </div>
      )}
      <div
        id={`${id}-jour`}
        role={remplis.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={
          remplis.length > 1
            ? `${id}-onglet-${remplis.indexOf(jour)}`
            : undefined
        }
      >
        {/* Un seul jour programmé : pas d'onglet, juste son nom. */}
        {remplis.length === 1 && (
          <div className="mb-3 font-serif text-base font-semibold">
            Jour {jour.numero}
          </div>
        )}
        <FriseProgramme moments={jour.moments} />
      </div>
    </div>
  );
}
