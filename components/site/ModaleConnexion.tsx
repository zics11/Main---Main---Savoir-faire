"use client";

import { connexion } from "@/app/connexion/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { FormulaireConnexion } from "./FormulaireConnexion";

/**
 * L'entrée « Connexion » du menu : un vrai lien vers /connexion, qu'un clic
 * ordinaire transforme en fenêtre. Comme pour le compte, la fenêtre est tenue
 * par le menu, pour survivre à la fermeture du volet.
 */
export function LienConnexion({
  className,
  onOuvrir,
}: {
  className?: string;
  onOuvrir: () => void;
}) {
  return (
    <a
      href="/connexion"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOuvrir();
      }}
      className={className}
    >
      Connexion
    </a>
  );
}

/** Se connecter sans perdre la page qu'on était en train de lire. */
export function ModaleConnexion({ onFermer }: { onFermer: () => void }) {
  return (
    <ModaleConfirmation titre="Se connecter" onClose={onFermer}>
      <FormulaireConnexion action={connexion} autoFocus />
    </ModaleConfirmation>
  );
}
