"use client";

import { useActionState } from "react";
import {
  delierCompte,
  envoyerMotDePasseTransmetteur,
  inviterTransmetteur,
  type InvitationState,
} from "@/app/admin/actions";

function Info({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{valeur}</dd>
    </div>
  );
}

export function CompteTransmetteur({
  transmetteurId,
  email,
  compteLie,
  aUnMotDePasse,
}: {
  transmetteurId: string;
  email: string;
  compteLie: boolean;
  aUnMotDePasse: boolean;
}) {
  const [etatInvit, inviter, invitEnCours] = useActionState<InvitationState>(
    inviterTransmetteur.bind(null, transmetteurId),
    null
  );
  const [etatMdp, envoyerMdp, mdpEnCours] = useActionState<InvitationState>(
    envoyerMotDePasseTransmetteur.bind(null, transmetteurId),
    null
  );
  const [etatDelier, delier, delierEnCours] = useActionState<InvitationState>(
    delierCompte.bind(null, transmetteurId),
    null
  );
  const message = etatDelier ?? etatMdp ?? etatInvit;

  // Tant que le compte n'existe pas, l'invitation le crée ; ensuite, le même
  // geste — lui envoyer un nouveau mot de passe — sert à le dépanner.
  const action = compteLie ? envoyerMdp : inviter;
  const enCours = compteLie ? mdpEnCours : invitEnCours;

  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-4 font-serif text-lg font-semibold">
        Compte du transmetteur
      </h2>

      <dl className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Info label="Identifiant" valeur={email} />
        <Info
          label="Mot de passe"
          valeur={
            !compteLie ? "—" : aUnMotDePasse ? "Défini" : "Aucun pour l'instant"
          }
        />
      </dl>

      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {compteLie ? (
          <>
            Il se connecte avec cette adresse pour modifier sa fiche et ses
            stages. Son mot de passe n&apos;est jamais affichable : pour le
            dépanner, envoyez-lui-en un nouveau. Changer l&apos;adresse
            ci-dessus déplace son compte ; le délier le lui retire, sans
            supprimer le compte.
          </>
        ) : (
          <>
            Aucun compte pour l&apos;instant. L&apos;invitation le crée et lui
            envoie un lien pour choisir son mot de passe, valable 14 jours.
            Vérifiez l&apos;adresse avant d&apos;envoyer : c&apos;est elle qui
            recevra tout.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <form action={action}>
          <button
            type="submit"
            disabled={enCours}
            className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
          >
            {enCours
              ? "Envoi…"
              : compteLie
                ? "Lui envoyer un nouveau mot de passe"
                : "Créer le compte et inviter"}
          </button>
        </form>

        {compteLie && (
          <form action={delier}>
            <button
              type="submit"
              disabled={delierEnCours}
              className="text-sm text-muted-foreground hover:text-destructive disabled:opacity-60"
            >
              {delierEnCours ? "…" : "Délier ce compte"}
            </button>
          </form>
        )}

        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-[#4f6b3a]" : "text-destructive"}`}
          >
            {message.message}
          </p>
        )}
      </div>
    </section>
  );
}
