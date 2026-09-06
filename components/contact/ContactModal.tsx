"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Stage, StageDate } from "@/lib/db/schema";
import type { ContactState } from "@/app/fiche/[slug]/contact-actions";
import { ContactForm } from "./ContactForm";

type Ouverture = { stageId?: string; dateId?: string } | null;

const ContactCtx = createContext<((o: Ouverture) => void) | null>(null);

/** Bouton qui ouvre la modale, éventuellement sur un stage/une date précis. */
export function ContactTrigger({
  stageId,
  dateId,
  className,
  children,
}: {
  stageId?: string;
  dateId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ouvrir = useContext(ContactCtx);
  return (
    <button
      type="button"
      className={className}
      onClick={() => ouvrir?.({ stageId, dateId })}
    >
      {children}
    </button>
  );
}

export function ContactProvider({
  fiche,
  offres,
  action,
  children,
}: {
  fiche: {
    slug: string;
    titre: string;
    nom: string;
    prenom: string;
    lieuApproximatif: string;
  };
  offres: (Stage & { dates: StageDate[] })[];
  action: (prevState: ContactState, formData: FormData) => Promise<ContactState>;
  children: React.ReactNode;
}) {
  const [ouverture, setOuverture] = useState<Ouverture>(null);

  // Échap pour fermer, et on bloque le défilement de la page derrière.
  useEffect(() => {
    if (!ouverture) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOuverture(null);
    }
    window.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [ouverture]);

  return (
    <ContactCtx.Provider value={setOuverture}>
      {children}

      {ouverture && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 sm:p-8"
          onClick={() => setOuverture(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Écrire à ${fiche.prenom}`}
            className="relative w-full max-w-2xl rounded-sm border border-border bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOuverture(null)}
              aria-label="Fermer"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg hover:bg-accent"
            >
              ×
            </button>
            <ContactForm
              fiche={fiche}
              offres={offres}
              initialStageId={ouverture.stageId}
              initialDateId={ouverture.dateId}
              action={action}
              onClose={() => setOuverture(null)}
            />
          </div>
        </div>
      )}
    </ContactCtx.Provider>
  );
}
