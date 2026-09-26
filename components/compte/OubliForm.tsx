"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { demanderReinitialisation } from "@/app/mot-de-passe-oublie/actions";

export function OubliForm() {
  const [etat, demander, enCours] = useActionState(demanderReinitialisation, null);

  return (
    <form action={demander} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Adresse email</span>
        <Input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="vous@exemple.fr"
          required
        />
      </label>

      {etat && (
        <p
          role="status"
          className={`text-sm ${etat.ok ? "text-[#4f6b3a]" : "text-destructive"}`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
      >
        {enCours ? "Envoi…" : "Envoyer le lien"}
      </button>

      <Link
        href="/connexion"
        className="mt-2 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Revenir à la connexion
      </Link>
    </form>
  );
}
