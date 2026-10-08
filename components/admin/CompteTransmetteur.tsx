"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import {
  annulerNouvelEmail,
  changerEmailFiche,
  envoyerRecuperation,
  inviterTransmetteur,
  type InvitationState,
} from "@/app/admin/actions";
import { bouton, intitule } from "@/lib/style";

function Info({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className={intitule}>
        {label}
      </dt>
      <dd className="mt-1 text-sm">{valeur}</dd>
    </div>
  );
}

export function CompteTransmetteur({
  transmetteurId,
  email,
  aUnMotDePasse,
  emailEnAttente,
  invitationEnvoyeeLe,
}: {
  transmetteurId: string;
  email: string;
  aUnMotDePasse: boolean;
  /** Dernier renvoi du mail d'inscription, s'il y en a eu un. */
  invitationEnvoyeeLe?: Date | null;
  /** Adresse demandée mais pas encore confirmée par le transmetteur. */
  emailEnAttente?: string | null;
}) {
  const [etatInvit, inviter, invitEnCours] = useActionState<InvitationState>(
    inviterTransmetteur.bind(null, transmetteurId),
    null
  );
  const [etatMdp, envoyerMdp, mdpEnCours] = useActionState<InvitationState>(
    envoyerRecuperation.bind(null, transmetteurId),
    null
  );
  const [etatAnnul, annulerEmail, annulEnCours] = useActionState<InvitationState>(
    annulerNouvelEmail.bind(null, transmetteurId),
    null
  );
  const [etatEmail, changerEmail, emailEnCours] = useActionState(
    changerEmailFiche.bind(null, transmetteurId),
    null
  );
  const [modaleEmail, setModaleEmail] = useState(false);
  const message = etatEmail ?? etatAnnul ?? etatMdp ?? etatInvit;


  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-4 font-serif text-xl font-semibold">
        Compte du transmetteur
      </h2>

      <dl className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className={intitule}>
            Identifiant
          </dt>
          <dd className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            {email}
            <button
              type="button"
              onClick={() => setModaleEmail(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Changer l&apos;adresse
            </button>
          </dd>
        </div>
        <Info
          label="Accès à son espace"
          valeur={
            aUnMotDePasse
              ? "Actif, mot de passe défini"
              : "Inscription pas encore finalisée"
          }
        />
      </dl>

      {emailEnAttente && (
        <div className="mb-5 rounded-sm border border-primary bg-accent px-4 py-3 text-sm">
          <div className="font-medium">
            Changement d&apos;adresse en attente : {emailEnAttente}
          </div>
          <p className="mt-0.5 text-muted-foreground">
            Un lien de confirmation lui a été envoyé. Tant qu&apos;il n&apos;a
            pas cliqué, il se connecte avec {email}.
          </p>
          <form action={annulerEmail} className="mt-2">
            <button
              type="submit"
              disabled={annulEnCours}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
            >
              Annuler ce changement
            </button>
          </form>
        </div>
      )}

      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Son mot de passe n&apos;est jamais affichable. Deux dépannages sont
        possibles : lui <strong className="text-foreground">renvoyer le mail
        d&apos;inscription</strong> s&apos;il ne l&apos;a jamais reçu ou plus
        retrouvé (lien valable 14 jours), ou lui{" "}
        <strong className="text-foreground">envoyer un mail de récupération</strong>{" "}
        s&apos;il a oublié son mot de passe (lien valable 2 heures). Dans les
        deux cas, c&apos;est lui qui choisit son mot de passe.
        {!aUnMotDePasse &&
          " La récupération n'a pas encore d'objet : il n'a pas de mot de passe à retrouver."}
        {invitationEnvoyeeLe &&
          ` Dernier renvoi du mail d'inscription le ${invitationEnvoyeeLe.toLocaleDateString("fr-FR")}.`}
      </p>

      {/* Les deux dépannages sont toujours proposés : c'est l'état du compte
          qui met en avant le plus probable, pas qui les cache. */}
      <div className="flex flex-wrap items-center gap-4">
        <form action={inviter}>
          <button
            type="submit"
            disabled={invitEnCours}
            className={aUnMotDePasse ? bouton.secondaire : bouton.primaire}
          >
            {invitEnCours ? "Envoi…" : "Renvoyer le mail d'inscription"}
          </button>
        </form>

        {/* Rien à récupérer tant qu'aucun mot de passe n'existe : le bouton
            reste visible, en retrait, pour qu'on sache qu'il viendra. */}
        <form action={envoyerMdp}>
          <button
            type="submit"
            disabled={mdpEnCours || !aUnMotDePasse}
            title={
              aUnMotDePasse
                ? undefined
                : "Disponible une fois que le transmetteur aura choisi son mot de passe."
            }
            className={aUnMotDePasse ? bouton.primaire : bouton.secondaire}
          >
            {mdpEnCours ? "Envoi…" : "Envoyer un mail de récupération"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-success-foreground" : "text-destructive"}`}
          >
            {message.message}
          </p>
        )}
      </div>

      {modaleEmail && (
        <ModaleConfirmation
          titre="Changer l'adresse email"
          onClose={() => setModaleEmail(false)}
        >
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Un lien de confirmation partira à la nouvelle adresse. Tant
            qu&apos;elle n&apos;est pas confirmée, le transmetteur continue de
            se connecter avec l&apos;actuelle.
          </p>
          <form
            action={async (formData) => {
              await changerEmail(formData);
              setModaleEmail(false);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Nouvelle adresse</span>
              <Input type="email" name="email" defaultValue={email} required />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={emailEnCours}
                className={bouton.primaire}
              >
                {emailEnCours ? "Envoi…" : "Enregistrer l'adresse"}
              </button>
              <button
                type="button"
                onClick={() => setModaleEmail(false)}
                className={bouton.discret}
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
