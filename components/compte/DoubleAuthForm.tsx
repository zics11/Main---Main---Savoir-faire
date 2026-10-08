"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  activerDoubleAuthentification,
  desactiverDoubleAuthentification,
  preparerDoubleAuthentification,
  type TotpState,
} from "@/app/mon-compte/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { bouton } from "@/lib/style";

type Enrolement = { secret: string; qr: string } | null;

/**
 * Activation du code d'application (TOTP). Le secret n'est considéré comme
 * actif qu'après vérification d'un premier code : une application mal
 * configurée ne peut donc pas verrouiller le compte.
 */
export function DoubleAuthForm({ active }: { active: boolean }) {
  const [enrolement, setEnrolement] = useState<Enrolement>(null);
  const [modaleArret, setModaleArret] = useState(false);
  const [enPreparation, setEnPreparation] = useState(false);
  const [etatActivation, activer, activationEnCours] = useActionState(
    activerDoubleAuthentification,
    null
  );
  const [etatArret, desactiver, arretEnCours] = useActionState<TotpState, FormData>(
    desactiverDoubleAuthentification,
    null
  );

  const codes = etatActivation?.ok ? etatActivation.codes : undefined;

  const commencer = async () => {
    setEnPreparation(true);
    const { secret, qr } = await preparerDoubleAuthentification();
    setEnrolement({ secret, qr });
    setEnPreparation(false);
  };

  return (
    <div className="mb-6 rounded-sm border border-border bg-card p-6">
      <h2 className="mb-2 font-serif text-xl font-semibold">
        Double authentification
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {active
          ? "À chaque connexion, un code à 6 chiffres de votre application vous est demandé en plus du mot de passe."
          : "Ajoute un code à 6 chiffres, généré par une application (Google Authenticator, 1Password, FreeOTP…), en plus du mot de passe. Un mot de passe volé ne suffit alors plus à entrer."}
      </p>

      {codes && (
        <div className="mb-5 rounded-sm border border-primary bg-accent p-4 text-sm">
          <div className="mb-1 font-medium">
            Vos codes de secours — notez-les maintenant
          </div>
          <p className="mb-3 text-muted-foreground">
            Ils ne seront plus affichés. Chacun ne sert qu&apos;une fois, si vous
            perdez votre téléphone.
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm select-all">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      )}

      {etatArret && (
        <p
          role="status"
          className={`mb-4 text-sm ${etatArret.ok ? "text-success-foreground" : "text-destructive"}`}
        >
          {etatArret.message}
        </p>
      )}

      {active ? (
        <button
          type="button"
          onClick={() => setModaleArret(true)}
          className={bouton.contour}
        >
          Désactiver
        </button>
      ) : (
        <button
          type="button"
          onClick={commencer}
          disabled={enPreparation}
          className={bouton.primaire}
        >
          {enPreparation ? "Un instant…" : "Activer"}
        </button>
      )}

      {/* La fenêtre se retire d'elle-même une fois l'activation réussie :
          les codes de secours s'affichent alors dans la page. */}
      {enrolement && !etatActivation?.ok && (
        <ModaleConfirmation
          titre="Activer la double authentification"
          onClose={() => setEnrolement(null)}
        >
          <ol className="mb-4 flex list-decimal flex-col gap-1 pl-4 text-sm text-muted-foreground">
            <li>Ouvrez votre application d&apos;authentification.</li>
            <li>Scannez ce QR code, ou saisissez la clé à la main.</li>
            <li>Recopiez ci-dessous le code à 6 chiffres affiché.</li>
          </ol>

          <div
            className="mx-auto mb-3 w-40 [&>svg]:h-full [&>svg]:w-full"
            // Le SVG est produit côté serveur par la bibliothèque qrcode.
            dangerouslySetInnerHTML={{ __html: enrolement.qr }}
          />
          <div className="mb-4 text-center font-mono text-xs break-all select-all">
            {enrolement.secret}
          </div>

          <form
            action={activer}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Code à 6 chiffres</span>
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </label>
            {etatActivation && !etatActivation.ok && (
              <p role="alert" className="text-sm text-destructive">
                {etatActivation.message}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={activationEnCours}
                className={bouton.primaire}
              >
                {activationEnCours ? "Vérification…" : "Vérifier et activer"}
              </button>
              <button
                type="button"
                onClick={() => setEnrolement(null)}
                className={bouton.discret}
              >
                Annuler
              </button>
            </div>
          </form>
        </ModaleConfirmation>
      )}

      {modaleArret && (
        <ModaleConfirmation
          titre="Désactiver la double authentification"
          onClose={() => setModaleArret(false)}
        >
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Votre compte ne sera plus protégé que par son mot de passe.
          </p>
          <form
            action={async (formData) => {
              await desactiver(formData);
              setModaleArret(false);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Votre mot de passe</span>
              <Input
                type="password"
                name="motDePasse"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Code à 6 chiffres</span>
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={arretEnCours}
                className={bouton.primaire}
              >
                {arretEnCours ? "Un instant…" : "Désactiver"}
              </button>
              <button
                type="button"
                onClick={() => setModaleArret(false)}
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
