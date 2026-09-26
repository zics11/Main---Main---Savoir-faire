"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { definirMotDePasse } from "@/app/mon-compte/actions";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";

/**
 * Changer son mot de passe est un geste à part : bouton dédié, fenêtre de
 * confirmation, et saisie de l'actuel quand il y en a un.
 */
export function MotDePasseForm({ aUnMotDePasse }: { aUnMotDePasse: boolean }) {
  const [ouverte, setOuverte] = useState(false);
  const [message, enregistrer, enCours] = useActionState(definirMotDePasse, null);

  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-2 font-serif text-xl font-semibold">Mot de passe</h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {aUnMotDePasse
          ? "Vous vous connectez avec votre adresse email et ce mot de passe."
          : "Aucun mot de passe pour l'instant : définissez-en un pour vous connecter avec votre adresse email."}
      </p>

      <button
        type="button"
        onClick={() => setOuverte(true)}
        className="rounded-sm border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-accent"
      >
        {aUnMotDePasse ? "Changer mon mot de passe" : "Définir un mot de passe"}
      </button>

      {message && !ouverte && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.ok ? "text-[#4f6b3a]" : "text-destructive"}`}
        >
          {message.message}
        </p>
      )}

      {ouverte && (
        <ModaleConfirmation
          titre={aUnMotDePasse ? "Changer mon mot de passe" : "Définir un mot de passe"}
          onClose={() => setOuverte(false)}
        >
          <form
            action={async (formData) => {
              await enregistrer(formData);
              setOuverte(false);
            }}
            className="flex flex-col gap-3"
          >
            {aUnMotDePasse && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Mot de passe actuel</span>
                <Input
                  type="password"
                  name="ancien"
                  autoComplete="current-password"
                  required
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">
                Nouveau mot de passe ({LONGUEUR_MIN_MOT_DE_PASSE} caractères
                minimum)
              </span>
              <Input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={LONGUEUR_MIN_MOT_DE_PASSE}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Confirmation</span>
              <Input
                type="password"
                name="confirmation"
                autoComplete="new-password"
                required
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={enCours}
                className="rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
              >
                {enCours ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setOuverte(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
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
