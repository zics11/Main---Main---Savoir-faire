"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EtatConnexion } from "@/app/connexion/actions";
import { Input } from "@/components/ui/input";
import { bouton } from "@/lib/style";

/**
 * Formulaire de connexion, en deux temps : l'adresse et le mot de passe,
 * puis — pour les comptes de l'association — le code de l'application
 * d'authentification. Tout se joue sur place, sans changer de page : la même
 * pièce sert donc à la page /connexion et à la fenêtre modale du menu.
 *
 * Il est côté client pour une autre raison encore : garantir que la touche
 * Entrée valide, quel que soit le navigateur. Les champs ne sont pas marqués
 * `required` — une validation bloquée par le navigateur donne l'impression
 * que la touche ne fait rien ; c'est le serveur qui répond.
 */
export function FormulaireConnexion({
  action,
  autoFocus = false,
}: {
  action: (
    precedent: EtatConnexion,
    formData: FormData,
  ) => Promise<EtatConnexion>;
  autoFocus?: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);
  const etapeCode = etat?.etape === "code";

  return (
    <>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        {etapeCode
          ? `Mot de passe vérifié pour ${etat?.email ?? "votre compte"}. Saisissez le code de votre application d'authentification.`
          : "Avec l'adresse email et le mot de passe reçus par email. Il n'y a pas d'inscription libre : les comptes sont créés par l'association."}
      </p>

      {etat?.erreur === "code" && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Code incorrect ou expiré. Réessayez avec le code affiché en ce moment.
        </p>
      )}
      {etat?.erreur === "identifiants" && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Adresse email ou mot de passe incorrect.
        </p>
      )}
      {etat?.erreur === "trop_de_tentatives" && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Trop de tentatives. Réessayez dans 15 minutes.
        </p>
      )}

      <form
        action={envoyer}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const cible = e.target as HTMLElement;
          if (cible.tagName !== "INPUT") return;
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }}
        className="flex flex-col gap-3"
      >
        {etapeCode ? (
          <>
            <input type="hidden" name="email" value={etat?.email ?? ""} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">
                Code à 6 chiffres de votre application
              </span>
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">
                Un code de secours fonctionne aussi.
              </span>
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Adresse email</span>
              <Input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="vous@exemple.fr"
                defaultValue={etat?.email ?? ""}
                autoFocus={autoFocus}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Mot de passe</span>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                autoFocus={Boolean(etat?.erreur)}
              />
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={enCours}
          className={`${bouton.primaire} mt-2`}
        >
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <Link
        href="/mot-de-passe-oublie"
        className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Mot de passe oublié ?
      </Link>
    </>
  );
}
