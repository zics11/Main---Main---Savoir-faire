"use client";

import { useActionState } from "react";
import { basculerEnLigne, demanderPublication } from "@/app/mes-stages/actions";

/**
 * Quatre situations : fiche en ligne, retirée du site, demande en attente, ou
 * pas encore soumise. La première mise en ligne appartient à l'association ;
 * après ça, le transmetteur retire et remet sa fiche comme il veut.
 */
export function DemandePublication({
  publiee,
  demandeeLe,
  dejaValidee,
  bloquee,
  manquants,
}: {
  publiee: boolean;
  demandeeLe: Date | null;
  dejaValidee: boolean;
  bloquee: boolean;
  manquants: string[];
}) {
  const [etatDemande, demander, demandeEnCours] = useActionState(
    demanderPublication,
    null
  );
  const [etatBascule, basculer, basculeEnCours] = useActionState(
    basculerEnLigne,
    null
  );
  const message = etatBascule ?? etatDemande;
  const demandeEnvoyee = etatDemande?.ok || demandeeLe !== null;

  if (bloquee) {
    return (
      <section className="mb-8 rounded-sm border border-destructive bg-destructive/5 px-5 py-4 text-sm">
        <div className="font-medium text-destructive">
          Votre fiche est suspendue par l&apos;association
        </div>
        <p className="mt-0.5 text-muted-foreground">
          Elle n&apos;est pas visible sur le site et vous ne pouvez pas la
          remettre en ligne. Contactez l&apos;association pour en savoir plus.
        </p>
      </section>
    );
  }

  const titre = publiee
    ? "Votre fiche est en ligne"
    : dejaValidee
      ? "Votre fiche est hors ligne"
      : demandeEnvoyee
        ? "Demande envoyée, en attente de validation"
        : "Votre fiche n'est pas encore en ligne";

  const detail = publiee
    ? "Vos modifications sont visibles dès l'enregistrement."
    : dejaValidee
      ? "Elle reste invisible du public tant que vous ne l'avez pas remise en ligne."
      : demandeEnvoyee
        ? "L'association la relit et la met en ligne."
        : manquants.length
          ? `Il reste à renseigner ${manquants.join(", ")}.`
          : "Elle est complète : demandez sa mise en ligne quand vous le souhaitez.";

  return (
    <section
      className={`mb-8 rounded-sm border px-5 py-4 ${
        publiee ? "border-border bg-card" : "border-primary bg-accent"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm">
          <div className="font-medium">{titre}</div>
          <p className="mt-0.5 text-muted-foreground">{detail}</p>
        </div>

        {dejaValidee ? (
          <form action={basculer}>
            <button
              type="submit"
              disabled={basculeEnCours || (!publiee && manquants.length > 0)}
              className={`rounded-sm px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${
                publiee
                  ? "border border-input bg-card text-foreground/80 hover:bg-accent"
                  : "bg-primary text-primary-foreground hover:bg-[#8a4222]"
              }`}
            >
              {basculeEnCours
                ? "Un instant…"
                : publiee
                  ? "Retirer du site"
                  : "Remettre en ligne"}
            </button>
          </form>
        ) : (
          !demandeEnvoyee && (
            <form action={demander}>
              <button
                type="submit"
                disabled={demandeEnCours || manquants.length > 0}
                className="rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-50"
              >
                {demandeEnCours ? "Envoi…" : "Demander la publication"}
              </button>
            </form>
          )
        )}
      </div>

      {message && !message.ok && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {message.message}
        </p>
      )}
    </section>
  );
}
