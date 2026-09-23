"use client";

import { useState } from "react";
import { deleteFiche } from "@/app/admin/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";

/**
 * Suppression définitive, en deux fenêtres : la seconde demande de recopier
 * le nom de la fiche, pour qu'aucun clic de trop ne l'efface.
 */
export function ZoneDangereuse({
  transmetteurId,
  nom,
}: {
  transmetteurId: string;
  nom: string;
}) {
  const [etape, setEtape] = useState<"repos" | "prevenu" | "confirmation">("repos");
  const [saisie, setSaisie] = useState("");

  const fermer = () => {
    setEtape("repos");
    setSaisie("");
  };

  return (
    <section
      style={{
        backgroundColor: "var(--statut-bloquee-fond)",
        borderColor: "var(--statut-bloquee)",
      }}
      className="rounded-sm border p-6"
    >
      <h2
        style={{ color: "var(--statut-bloquee)" }}
        className="mb-2 font-serif text-lg font-semibold"
      >
        Zone dangereuse
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Supprimer cette fiche efface aussi ses stages, ses dates, ses
        témoignages et ses photos, définitivement.
      </p>
      <button
        type="button"
        onClick={() => setEtape("prevenu")}
        className="rounded-sm border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
      >
        Supprimer la fiche
      </button>

      {etape === "prevenu" && (
        <ModaleConfirmation titre="Supprimer cette fiche ?" onClose={fermer}>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Supprimer « {nom} » est définitif : ni la fiche ni ses photos ne
            pourront être récupérées. Pour la retirer du site sans rien perdre,
            bloquez-la plutôt.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setEtape("confirmation")}
              className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
            >
              Continuer
            </button>
            <button
              type="button"
              onClick={fermer}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
        </ModaleConfirmation>
      )}

      {etape === "confirmation" && (
        <ModaleConfirmation titre="Confirmer la suppression" onClose={fermer}>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            Recopiez <strong className="text-foreground">{nom}</strong> pour
            confirmer.
          </p>
          <form
            action={deleteFiche.bind(null, transmetteurId)}
            className="flex flex-col gap-4"
          >
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              aria-label="Nom de la fiche à supprimer"
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={saisie.trim() !== nom}
                className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-50"
              >
                Supprimer définitivement
              </button>
              <button
                type="button"
                onClick={fermer}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          </form>
        </ModaleConfirmation>
      )}
    </section>
  );
}
