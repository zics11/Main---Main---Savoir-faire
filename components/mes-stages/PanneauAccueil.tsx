"use client";

import { useState } from "react";

/**
 * Premiers pas, affichés au retour du lien d'accueil (…/mes-stages?bienvenue=1).
 * Refermable : c'est un guide de départ, pas un élément permanent de la page.
 */
export function PanneauAccueil({ publiee }: { publiee: boolean }) {
  const [ouvert, setOuvert] = useState(true);
  if (!ouvert) return null;

  const etapes = [
    "Onglet Fiche : complétez votre présentation, vos photos et vos infos pratiques.",
    "Onglet Stages : ajoutez vos stages, puis leurs dates et leurs places.",
    publiee
      ? "Votre fiche est déjà en ligne : vos modifications sont visibles dès l'enregistrement."
      : "L'association publiera votre fiche ; vous pouvez la préparer tranquillement d'ici là.",
  ];

  return (
    <section className="mb-8 rounded-sm border border-primary bg-accent p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="mb-2 font-serif text-xl font-semibold">
          Bienvenue, votre compte est prêt
        </h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Masquer ces premiers pas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Masquer
        </button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Votre mot de passe est enregistré : vous vous connecterez avec votre
        adresse email et ce mot de passe. Il reste trois choses à faire.
      </p>
      <ol className="flex flex-col gap-2 text-sm">
        {etapes.map((etape, i) => (
          <li key={etape} className="flex gap-3">
            <span className="font-semibold text-primary">{i + 1}.</span>
            <span>{etape}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
