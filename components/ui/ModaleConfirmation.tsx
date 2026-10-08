"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { boutonFermer, titre as titre_ } from "@/lib/style";

/**
 * Fenêtre de confirmation, sur le modèle de la modale de contact : fond
 * assombri cliquable, Échap pour fermer, défilement de la page bloqué. Elle
 * pose sa propre couleur de texte : ouverte depuis l'en-tête sombre de
 * l'administration, elle en hériterait l'encre claire.
 */
export function ModaleConfirmation({
  titre,
  children,
  onClose,
  largeur = "max-w-md",
}: {
  titre: string;
  children: React.ReactNode;
  onClose: () => void;
  /** Largeur maximale du panneau : à élargir pour les contenus longs. */
  largeur?: string;
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
        className={`relative mt-16 w-full ${largeur} rounded-sm border border-border bg-background p-6 text-foreground shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className={`absolute top-3 right-3 ${boutonFermer}`}
        >
          <XIcon aria-hidden className="h-5 w-5" />
        </button>
        <h2 className={`mb-3 pr-10 ${titre_.carte}`}>{titre}</h2>
        {children}
      </div>
    </div>
  );
}
