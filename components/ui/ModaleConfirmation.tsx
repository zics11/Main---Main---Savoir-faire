"use client";

import { useEffect } from "react";

/**
 * Fenêtre de confirmation, sur le modèle de la modale de contact : fond
 * assombri cliquable, Échap pour fermer, défilement de la page bloqué.
 */
export function ModaleConfirmation({
  titre,
  children,
  onClose,
}: {
  titre: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className="relative mt-16 w-full max-w-md rounded-sm border border-border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg hover:bg-accent"
        >
          ×
        </button>
        <h2 className="mb-3 pr-10 font-serif text-xl font-semibold">{titre}</h2>
        {children}
      </div>
    </div>
  );
}
