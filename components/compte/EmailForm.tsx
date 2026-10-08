"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  annulerMonChangementEmail,
  changerMonEmail,
  type CompteState,
} from "@/app/mon-compte/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { bouton } from "@/lib/style";

/**
 * Le titulaire change son adresse lui-même, avec trois garde-fous : son mot
 * de passe, une alerte à l'adresse actuelle, et un lien de confirmation à la
 * nouvelle — seul le clic sur ce lien rend le changement effectif.
 */
export function EmailForm({
  email,
  enAttente,
  aUnMotDePasse,
}: {
  email: string;
  /** Un mot de passe existe : il est redemandé pour lancer le changement. */
  aUnMotDePasse: boolean;
  /** Changement lancé, en attente du clic sur le lien de confirmation. */
  enAttente: string | null;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [etat, changer, enCours] = useActionState(changerMonEmail, null);
  const [etatAnnul, annuler, annulEnCours] = useActionState<CompteState>(
    annulerMonChangementEmail,
    null
  );
  const message = etatAnnul ?? etat;

  return (
    <div className="mb-6 rounded-sm border border-border bg-card p-6">
      <h2 className="mb-2 font-serif text-xl font-semibold">Adresse email</h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        C&apos;est votre identifiant de connexion :{" "}
        <strong className="text-foreground">{email}</strong>.
      </p>

      {enAttente && (
        <div className="mb-5 rounded-sm border border-primary bg-accent px-4 py-3 text-sm">
          <div className="font-medium">Changement en attente : {enAttente}</div>
          <p className="mt-0.5 text-muted-foreground">
            Cliquez le lien reçu à cette adresse pour la rendre active. D&apos;ici
            là, vous vous connectez toujours avec {email}.
          </p>
          <form action={annuler} className="mt-2">
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

      <button
        type="button"
        onClick={() => setOuverte(true)}
        className={bouton.contour}
      >
        Changer mon adresse
      </button>

      {message && !ouverte && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.ok ? "text-success-foreground" : "text-destructive"}`}
        >
          {message.message}
        </p>
      )}

      {ouverte && (
        <ModaleConfirmation
          titre="Changer mon adresse email"
          onClose={() => setOuverte(false)}
        >
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Un lien de confirmation partira à la nouvelle adresse : rien ne
            change tant que vous n&apos;avez pas cliqué dessus. Une alerte part
            aussi à votre adresse actuelle, pour que toute demande qui ne
            viendrait pas de vous se repère.
          </p>
          <form
            action={async (formData) => {
              await changer(formData);
              setOuverte(false);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Nouvelle adresse</span>
              <Input type="email" name="email" defaultValue={email} required />
            </label>
            {aUnMotDePasse && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  Votre mot de passe, pour confirmer que c&apos;est bien vous
                </span>
                <Input
                  type="password"
                  name="motDePasse"
                  autoComplete="current-password"
                  required
                />
              </label>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={enCours}
                className={bouton.primaire}
              >
                {enCours ? "Envoi…" : "Envoyer le lien de confirmation"}
              </button>
              <button
                type="button"
                onClick={() => setOuverte(false)}
                className={bouton.discret}
              >
                Annuler
              </button>
            </div>
          </form>
        </ModaleConfirmation>
      )}
    </div>
  );
}
