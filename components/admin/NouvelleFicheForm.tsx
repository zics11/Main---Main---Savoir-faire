"use client";

import { useActionState } from "react";
import { createFiche } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { DOMAINE_LABELS } from "@/lib/constants";
import { DOMAINES } from "@/lib/db/schema";
import { bouton, champ } from "@/lib/style";

// Création volontairement minimale : l'association ouvre la fiche avec le
// strict nécessaire, et le transmetteur la complète lui-même depuis son
// espace (présentation, photos, lieu, stages…).
export function NouvelleFicheForm() {
  const [etat, creer, enCours] = useActionState(createFiche, null);
  const erreur = etat && "erreur" in etat ? etat : null;
  const v = erreur?.valeurs;

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
            className={champ}
          >
            {DOMAINES.map((d) => (
              <option key={d} value={d}>
                {DOMAINE_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className={`${bouton.primaire} mt-1`}
        >
          {enCours ? "Création…" : "Créer la fiche et inviter"}
        </button>
      </div>
    </form>
  );
}
