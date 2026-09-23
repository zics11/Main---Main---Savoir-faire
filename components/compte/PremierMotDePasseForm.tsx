"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { definirPremierMotDePasse } from "@/app/bienvenue/[token]/actions";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";

export function PremierMotDePasseForm({ jeton }: { jeton: string }) {
  const [etat, definir, enCours] = useActionState(
    definirPremierMotDePasse.bind(null, jeton),
    null
  );

  return (
    <form action={definir} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">
          Mot de passe ({LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum)
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
      {etat?.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
      >
        {enCours ? "Un instant…" : "Accéder à mon espace"}
      </button>
    </form>
  );
}
