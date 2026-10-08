"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { demanderReinitialisation } from "@/app/mot-de-passe-oublie/actions";
import { bouton } from "@/lib/style";

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
          className={`text-sm ${etat.ok ? "text-success-foreground" : "text-destructive"}`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={`${bouton.primaire} mt-2`}
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
