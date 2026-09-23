"use client";

import { useActionState } from "react";
import { createFiche } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { DOMAINE_LABELS } from "@/lib/constants";
import { DOMAINES } from "@/lib/db/schema";

// Création volontairement minimale : l'association ouvre la fiche avec le
// strict nécessaire, et le transmetteur la complète lui-même depuis son
// espace (présentation, photos, lieu, stages…).
export function NouvelleFicheForm() {
  const [etat, creer, enCours] = useActionState(createFiche, null);
  const v = etat?.valeurs;

  return (
    <form action={creer} className="max-w-lg">
      <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Nom du transmetteur</span>
          <Input name="nom" defaultValue={v?.nom} required />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">
            Adresse email (identifiant de connexion)
          </span>
          <Input
            type="email"
            name="email"
            defaultValue={v?.email}
            placeholder="lui@exemple.fr"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Domaine</span>
          <select
            name="domaine"
            defaultValue={v?.domaine}
            className="w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm"
          >
            {DOMAINES.map((d) => (
              <option key={d} value={d}>
                {DOMAINE_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        {etat?.erreur && (
          <p role="alert" className="text-sm text-destructive">
            {etat.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="mt-1 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
        >
          {enCours ? "Création…" : "Créer la fiche et inviter"}
        </button>
      </div>
    </form>
  );
}
