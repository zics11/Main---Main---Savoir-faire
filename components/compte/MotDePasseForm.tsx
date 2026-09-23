"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { definirMotDePasse } from "@/app/mon-compte/actions";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";

export function MotDePasseForm({ aUnMotDePasse }: { aUnMotDePasse: boolean }) {
  const [message, enregistrer, enCours] = useActionState(definirMotDePasse, null);

  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-2 font-serif text-xl font-semibold">
        {aUnMotDePasse ? "Changer mon mot de passe" : "Définir un mot de passe"}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {aUnMotDePasse
          ? "Choisissez celui que vous voulez : il remplace celui que vous avez reçu par email."
          : "Il vous servira à vous connecter avec votre adresse email."}{" "}
        {LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.
      </p>

      <form action={enregistrer} className="flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Nouveau mot de passe</span>
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
        <button
          type="submit"
          disabled={enCours}
          className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-[#4f6b3a]" : "text-destructive"}`}
          >
            {message.message}
          </p>
        )}
      </form>
    </div>
  );
}
