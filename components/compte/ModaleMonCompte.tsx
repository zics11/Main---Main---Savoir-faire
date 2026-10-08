"use client";

import { useEffect, useState } from "react";
import { donneesCompte } from "@/app/mon-compte/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { DoubleAuthForm } from "./DoubleAuthForm";
import { EmailForm } from "./EmailForm";
import { MotDePasseForm } from "./MotDePasseForm";

type Donnees = Awaited<ReturnType<typeof donneesCompte>>;

/**
 * L'entrée « Mon compte » du menu. Elle reste un vrai lien vers /mon-compte —
 * un Ctrl+clic ou un navigateur sans JavaScript y mènent toujours — mais un
 * clic ordinaire ouvre la fenêtre, qui est tenue par le menu lui-même : posée
 * ici, elle disparaîtrait avec le volet qui se referme.
 */
export function LienMonCompte({
  className,
  onOuvrir,
}: {
  className?: string;
  onOuvrir: () => void;
}) {
  return (
    <a
      href="/mon-compte"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOuvrir();
      }}
      className={className}
    >
      Mon compte
    </a>
  );
}

/**
 * Le compte en fenêtre, comme la connexion : on change son mot de passe sans
 * quitter la page qu'on lisait. La page /mon-compte, elle, reste en place
 * pour les accès directs.
 */
export function ModaleMonCompte({ onFermer }: { onFermer: () => void }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);

  // Les données du compte ne sont demandées qu'à l'ouverture : inutile de les
  // charger sur chaque page pour une fenêtre qu'on n'ouvrira peut-être jamais.
  useEffect(() => {
    let vivant = true;
    donneesCompte().then((d) => {
      if (vivant) setDonnees(d);
    });
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <ModaleConfirmation
      titre={donnees?.email ?? "Mon compte"}
      largeur="max-w-2xl"
      onClose={onFermer}
    >
      {donnees === null ? (
        <p className="py-6 text-sm text-muted-foreground">Un instant…</p>
      ) : (
        <>
          <EmailForm
            email={donnees.email}
            aUnMotDePasse={donnees.aUnMotDePasse}
            enAttente={donnees.enAttente}
          />
          <MotDePasseForm aUnMotDePasse={donnees.aUnMotDePasse} />
          {donnees.doubleAuth !== null && (
            <DoubleAuthForm active={donnees.doubleAuth} />
          )}
        </>
      )}
    </ModaleConfirmation>
  );
}
