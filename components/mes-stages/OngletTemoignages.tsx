"use client";

import type {
  DemandeAffichee,
  EtatDemandeTemoignage,
} from "@/lib/demandes-temoignage";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import {
  DemanderTemoignage,
  ListeDemandes,
} from "@/components/temoignage/DemandesTemoignage";
import { carte, titre } from "@/lib/style";

export type TemoignageAffiche = {
  id: string;
  texte: string;
  auteur: string;
  contexte: string;
};

/**
 * L'onglet Témoignages de l'espace transmetteur : demander un mot à une
 * personne venue en stage, suivre les demandes, voir ce qui est publié. Les
 * témoignages s'y lisent seulement : seule l'association peut y toucher.
 */
export function OngletTemoignages({
  stages,
  demandes,
  temoignages,
  demander,
}: {
  stages: { id: string; titre: string }[];
  demandes: DemandeAffichee[];
  temoignages: TemoignageAffiche[];
  demander: (
    precedent: EtatDemandeTemoignage,
    formData: FormData,
  ) => Promise<EtatDemandeTemoignage>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className={titre.section}>Témoignages</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Demandez un mot à celles et ceux qui sont venus en stage. Leur texte
          paraît ensuite sur votre fiche.
        </p>
      </div>

      <DemanderTemoignage stages={stages} demander={demander} />
      <ListeDemandes demandes={demandes} />

      <div className={carte}>
        <h3 className={`mb-4 ${titre.carte}`}>
          Publiés sur votre fiche
          <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
            {temoignages.length}
          </span>
        </h3>
        {temoignages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas encore de témoignage.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {temoignages.map((t) => (
              <figure key={t.id} className="border-l-2 border-input pl-4">
                <blockquote className="mb-1.5 text-sm leading-relaxed text-foreground/90 italic">
                  « {t.texte} »
                </blockquote>
                <figcaption className="text-xs text-muted-foreground">
                  {t.auteur} — {t.contexte}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="mt-5 text-xs text-muted-foreground">
          Pour retirer un témoignage, écrivez à l&apos;association.
        </p>
      </div>

      {/* La barre de l'espace, la même que dans les autres onglets ; rien
          ne s'y enregistre ici : chaque demande part tout de suite. */}
      <BarreEnregistrement />
    </section>
  );
}
