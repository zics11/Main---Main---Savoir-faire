"use client";

import { Input } from "@/components/ui/input";

/**
 * Formulaire de connexion. Il est côté client pour une seule raison : garantir
 * que la touche Entrée valide, quel que soit le navigateur. Les champs ne sont
 * pas marqués `required` — une validation bloquée par le navigateur donne
 * l'impression que la touche ne fait rien ; c'est le serveur qui répond.
 */
export function FormulaireConnexion({
  action,
  etapeCode,
  email,
}: {
  action: (formData: FormData) => void | Promise<void>;
  etapeCode: boolean;
  email: string;
}) {
  return (
    <form
      action={action}
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
          <input type="hidden" name="email" value={email} />
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
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Mot de passe</span>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </label>
        </>
      )}

      <button
        type="submit"
        className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
      >
        Se connecter
      </button>
    </form>
  );
}
