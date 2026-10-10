"use client";

import { useActionState, useState } from "react";
import { HeartIcon } from "lucide-react";
import type { EtatDon } from "@/app/soutenir/actions";
import {
  apresReduction,
  enEuros,
  MONTANT_MAX,
  MONTANT_MIN,
  MONTANTS_CONSEILLES,
  REDUCTION_IMPOT,
  type SourceDon,
} from "@/lib/dons";
import { bouton, cadreChamp, grand, message } from "@/lib/style";
import { cn } from "@/lib/utils";

type Frequence = "unique" | "mensuel";

// Le vert des dons (voir --soutien), à la place de la terre cuite du site.
const puce = (on: boolean) =>
  cn(
    "rounded-sm border px-4 py-2.5 text-sm font-semibold",
    on
      ? "border-[var(--soutien)] bg-[var(--soutien)] text-white"
      : "border-[var(--soutien)] bg-card text-[var(--soutien)] hover:bg-[var(--soutien-fond)]",
  );

/**
 * Le formulaire de don : une fois ou chaque mois, un montant conseillé ou le
 * sien. Le bouton dit exactement ce qui sera donné.
 */
export function FormulaireDon({
  montantInitial,
  source,
  donner,
}: {
  montantInitial: number;
  source: SourceDon;
  donner: (precedent: EtatDon, formData: FormData) => Promise<EtatDon>;
}) {
  const conseille = (MONTANTS_CONSEILLES as readonly number[]).includes(
    montantInitial,
  );
  const [frequence, setFrequence] = useState<Frequence>("unique");
  const [choix, setChoix] = useState<number | "autre">(
    conseille ? montantInitial : "autre",
  );
  const [autre, setAutre] = useState(conseille ? "" : String(montantInitial));
  const [etat, envoyer, enCours] = useActionState(donner, null);

  const montant = choix === "autre" ? Number(autre) : choix;
  const valable =
    Number.isInteger(montant) &&
    montant >= MONTANT_MIN &&
    montant <= MONTANT_MAX;
  const parMois = frequence === "mensuel" ? " par mois" : "";

  return (
    <form action={envoyer} className="flex flex-col gap-5">
      <input type="hidden" name="montant" value={valable ? montant : ""} />
      <input type="hidden" name="frequence" value={frequence} />
      <input type="hidden" name="source" value={source} />

      <div
        role="radiogroup"
        aria-label="Fréquence"
        className="grid grid-cols-2 gap-2"
      >
        {(
          [
            ["unique", "Une fois"],
            ["mensuel", "Chaque mois"],
          ] as const
        ).map(([v, libelle]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={frequence === v}
            onClick={() => setFrequence(v)}
            className={puce(frequence === v)}
          >
            {libelle}
          </button>
        ))}
      </div>

      <div>
        <div
          role="radiogroup"
          aria-label="Montant"
          className="flex flex-wrap gap-2"
        >
          {MONTANTS_CONSEILLES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={choix === m}
              onClick={() => setChoix(m)}
              className={cn(puce(choix === m), "min-w-[4.5rem]")}
            >
              {enEuros(m)}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choix === "autre"}
            onClick={() => setChoix("autre")}
            className={puce(choix === "autre")}
          >
            Autre
          </button>
        </div>
        {choix === "autre" && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Montant</span>
            <input
              type="number"
              inputMode="numeric"
              min={MONTANT_MIN}
              max={MONTANT_MAX}
              step={1}
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              autoFocus
              className={cn(cadreChamp, "w-28")}
            />
            <span className="text-muted-foreground">€</span>
          </label>
        )}
      </div>

      {REDUCTION_IMPOT && valable && (
        <p className="text-sm text-muted-foreground">
          Après réduction d&apos;impôt, votre don vous revient à{" "}
          <strong className="text-foreground">
            {enEuros(apresReduction(montant))}
          </strong>
          {parMois}.
        </p>
      )}

      <button
        type="submit"
        disabled={!valable || enCours}
        className={cn(
          bouton.primaire,
          grand,
          "w-full bg-[var(--soutien)] text-white hover:bg-[var(--soutien-survol)]",
        )}
      >
        <HeartIcon aria-hidden className="h-4 w-4" />
        {valable ? `Donner ${enEuros(montant)}${parMois}` : "Donner"}
      </button>

      {etat && (
        <p
          role={"erreur" in etat ? "alert" : "status"}
          className={
            "erreur" in etat
              ? message.erreur
              : "rounded-sm border border-[var(--statut-a-valider)]/40 bg-[var(--statut-a-valider-fond)] px-4 py-3 text-sm text-[var(--statut-a-valider)]"
          }
        >
          {"erreur" in etat ? etat.erreur : etat.apercu}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Vous serez dirigé vers une page de paiement sécurisée. Le site
        n&apos;enregistre aucune donnée bancaire.
      </p>
    </form>
  );
}
