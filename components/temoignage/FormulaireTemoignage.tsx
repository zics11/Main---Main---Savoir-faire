"use client";

import { useActionState, useState, useTransition } from "react";
import type { EtatTemoignage } from "@/app/temoignage/[jeton]/actions";
import { bouton, champ, grand, message } from "@/lib/style";

/**
 * Le formulaire du lien reçu par email : écrire quelques mots, ou décliner.
 * Une fois la réponse donnée, la page se recharge d'elle-même et affiche son
 * remerciement : ce composant ne s'occupe que des refus.
 */
export function FormulaireTemoignage({
  auteurPropose,
  contexte,
  longueurMax,
  publier,
  decliner,
}: {
  auteurPropose: string;
  contexte: string;
  longueurMax: number;
  publier: (
    precedent: EtatTemoignage,
    formData: FormData,
  ) => Promise<EtatTemoignage>;
  decliner: () => Promise<void>;
}) {
  const [texte, setTexte] = useState("");
  const [auteur, setAuteur] = useState(auteurPropose);
  const [etat, envoyer, enCours] = useActionState(publier, null);
  const [declinEnCours, demarrer] = useTransition();
  const occupe = enCours || declinEnCours;
  const reste = longueurMax - texte.length;

  return (
    <form action={envoyer} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Votre témoignage</span>
        <textarea
          name="texte"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={longueurMax}
          rows={7}
          placeholder="Ce que vous avez appris, ce qui vous a marqué, ce que vous diriez à quelqu'un qui hésite…"
          className={`${champ} leading-relaxed`}
        />
        <span
          className={`self-end text-xs ${reste < 100 ? "text-[var(--statut-a-valider)]" : "text-muted-foreground"}`}
        >
          {reste} caractère{reste > 1 ? "s" : ""} restant{reste > 1 ? "s" : ""}
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Signé</span>
        <input
          name="auteur"
          value={auteur}
          onChange={(e) => setAuteur(e.target.value)}
          maxLength={80}
          className={champ}
        />
        <span className="text-xs text-muted-foreground">
          Le nom affiché sous votre témoignage — votre prénom suffit. Il
          paraîtra ainsi : {auteur.trim() || "…"} — {contexte}
        </span>
      </label>

      {etat && !etat.ok && (
        <p role="alert" className={message.erreur}>
          {etat.erreur}
        </p>
      )}

      <div className="flex flex-col items-start gap-4 border-t border-border pt-5">
        <button
          type="submit"
          disabled={occupe || !texte.trim() || !auteur.trim()}
          className={`${bouton.primaire} ${grand}`}
        >
          {enCours ? "Envoi…" : "Publier mon témoignage"}
        </button>
        <button
          type="button"
          disabled={occupe}
          onClick={() => demarrer(decliner)}
          className={bouton.discret}
        >
          {declinEnCours
            ? "Un instant…"
            : "Je préfère ne pas laisser de témoignage"}
        </button>
      </div>
    </form>
  );
}
