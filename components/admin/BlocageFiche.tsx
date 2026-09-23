"use client";

import { useState } from "react";
import { basculerBlocage } from "@/app/admin/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";

/**
 * Suspension d'une fiche, confirmée dans une fenêtre. Distinct de la zone
 * dangereuse, qui ne sert qu'à supprimer : bloquer est réversible.
 */
export function BlocageFiche({
  transmetteurId,
  nom,
  bloquee,
}: {
  transmetteurId: string;
  nom: string;
  bloquee: boolean;
}) {
  const [ouverte, setOuverte] = useState(false);

  // La fenêtre se referme une fois l'action passée.
  const confirmer = async () => {
    await basculerBlocage(transmetteurId);
    setOuverte(false);
  };

  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-2 font-serif text-lg font-semibold">
        {bloquee ? "Fiche bloquée" : "Blocage de la fiche"}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {bloquee
          ? "Cette fiche est retirée du site et le transmetteur ne peut ni la remettre en ligne ni en redemander la publication. Vous seul pouvez lever le blocage."
          : "Retire la fiche du site et empêche le transmetteur de la remettre en ligne ou d'en redemander la publication. Rien n'est perdu : le blocage se lève quand vous voulez."}
      </p>
      <button
        type="button"
        onClick={() => setOuverte(true)}
        className="rounded-sm border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
      >
        {bloquee ? "Débloquer la fiche" : "Bloquer la fiche"}
      </button>

      {ouverte && (
        <ModaleConfirmation
          titre={bloquee ? "Lever le blocage ?" : "Bloquer cette fiche ?"}
          onClose={() => setOuverte(false)}
        >
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            {bloquee
              ? `« ${nom} » restera hors ligne, mais le transmetteur pourra de nouveau en demander la publication.`
              : `« ${nom} » sera retirée du site et le transmetteur ne pourra plus la remettre en ligne.`}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <form action={confirmer}>
              <button
                type="submit"
                className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
              >
                {bloquee ? "Confirmer le déblocage" : "Confirmer le blocage"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setOuverte(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
        </ModaleConfirmation>
      )}
    </section>
  );
}
