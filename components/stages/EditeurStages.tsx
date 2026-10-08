"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, PlusIcon } from "lucide-react";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import type { EtatStage } from "@/lib/stage";
import {
  FormulaireStage,
  type ActionStage,
  type StageAvecDates,
} from "./FormulaireStage";
import { bouton } from "@/lib/style";
import { EtiquetteForme } from "@/components/shared/Etiquettes";

const jourCourt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * Les stages d'une fiche, dans l'admin comme dans l'espace transmetteur :
 * une liste de résumés, et un seul stage ouvert à la fois pour le modifier.
 * Un stage s'enregistre d'un geste, dates comprises, depuis la barre du bas.
 */
export function EditeurStages({
  stages,
  enregistrer,
  supprimer,
  titre = "Stages",
}: {
  stages: StageAvecDates[];
  enregistrer: ActionStage;
  supprimer: (stageId: string) => Promise<void>;
  titre?: string;
}) {
  /** Le stage ouvert : son identifiant, « nouveau », ou aucun. */
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [modifie, setModifie] = useState(false);
  /** Ce que la barre doit annoncer après un enregistrement. */
  const [retour, setRetour] = useState<{
    stageId: string | null;
    erreur: string | null;
  } | null>(null);
  /** Message laissé dans la barre une fois le stage refermé (suppression). */
  const [messageBarre, setMessageBarre] = useState<string | null>(null);
  /** Stage qu'on voulait ouvrir alors que le précédent avait des modifications. */
  const [enSuspens, setEnSuspens] = useState<string | null>(null);

  function ouvrir(cible: string) {
    if (cible === ouvert) return;
    if (ouvert && modifie) {
      setEnSuspens(cible);
      return;
    }
    setRetour(null);
    setMessageBarre(null);
    setOuvert(cible);
  }

  function resultat(r: EtatStage) {
    if (!r) return;
    if (r.ok) {
      // Un stage créé devient le stage ouvert : on continue sur lui.
      setOuvert(r.stageId);
      setRetour({ stageId: r.stageId, erreur: null });
    } else {
      setRetour({
        stageId: ouvert === "nouveau" ? null : ouvert,
        erreur: r.erreur,
      });
    }
  }

  const ouvertActuel = stages.find((s) => s.id === ouvert) ?? null;
  const editeur = (stage: StageAvecDates | null) => (
    <FormulaireStage
      // Un enregistrement change la date de modification : le formulaire
      // repart alors des valeurs enregistrées, photos comprises.
      key={stage ? `${stage.id}-${stage.updatedAt.getTime()}` : "nouveau"}
      stage={stage}
      enregistrer={enregistrer}
      supprimer={supprimer}
      justeEnregistre={
        retour !== null && retour.stageId === stage?.id && !retour.erreur
      }
      erreur={
        retour?.erreur && (retour.stageId ?? null) === (stage?.id ?? null)
          ? retour.erreur
          : null
      }
      onResultat={resultat}
      onModifie={setModifie}
      onFermer={() => {
        setOuvert(null);
        setRetour(null);
      }}
      onSupprime={() => {
        setMessageBarre(`Stage « ${stage?.titre ?? ""} » supprimé.`);
        setOuvert(null);
        setRetour(null);
      }}
    />
  );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{titre}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Un stage, c&apos;est une activité : son intitulé, son prix, son
            programme. Il peut revenir à plusieurs dates, chacune avec ses
            places.
          </p>
        </div>
        <button
          type="button"
          onClick={() => ouvrir("nouveau")}
          disabled={ouvert === "nouveau"}
          className={`${bouton.primaire} flex items-center gap-1.5`}
        >
          <PlusIcon aria-hidden className="h-4 w-4" />
          Nouveau stage
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {ouvert === "nouveau" && editeur(null)}

        {stages.map((s) =>
          s.id === ouvert && ouvertActuel ? (
            <div key={s.id}>{editeur(ouvertActuel)}</div>
          ) : (
            <ResumeStage key={s.id} stage={s} onModifier={() => ouvrir(s.id)} />
          ),
        )}

        {stages.length === 0 && ouvert !== "nouveau" && (
          <div className="rounded-sm border border-dashed border-input bg-card px-6 py-10 text-center">
            <p className="font-serif text-xl font-semibold">
              Aucun stage pour l&apos;instant
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez le premier : il apparaîtra sur la fiche dès qu&apos;il aura
              une date à venir.
            </p>
          </div>
        )}
      </div>

      {/* Aucun stage ouvert : la barre reste là, rien à enregistrer. Le
          formulaire d'un stage ouvert porte la sienne. */}
      {!ouvert && <BarreEnregistrement info={messageBarre} />}

      {enSuspens && (
        <ModaleConfirmation
          titre="Abandonner les modifications ?"
          onClose={() => setEnSuspens(null)}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            Le stage ouvert a des modifications non enregistrées. Enregistrez-le
            d&apos;abord depuis la barre du bas, ou abandonnez ces
            modifications.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setEnSuspens(null)}
              className={bouton.secondaire}
            >
              Revenir au stage
            </button>
            <button
              type="button"
              onClick={() => {
                setRetour(null);
                setOuvert(enSuspens);
                setEnSuspens(null);
              }}
              className={bouton.danger}
            >
              Abandonner
            </button>
          </div>
        </ModaleConfirmation>
      )}
    </section>
  );
}

/** Un stage refermé : de quoi le reconnaître, et savoir s'il se voit en ligne. */
function ResumeStage({
  stage,
  onModifier,
}: {
  stage: StageAvecDates;
  onModifier: () => void;
}) {
  const maintenant = new Date();
  const aVenir = stage.dates
    .filter((d) => d.publiee && d.dateFin >= maintenant)
    .sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime());
  const reperes = [stage.duree, stage.prix].filter(Boolean);

  return (
    <article className="flex items-center gap-4 rounded-sm border border-border bg-card p-4">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary text-muted-foreground">
        {stage.photos[0] ? (
          <Image
            src={stage.photos[0]}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <ImageIcon aria-hidden className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-lg leading-tight font-semibold">
          {stage.titre}
        </h3>
        {(stage.type || reperes.length > 0) && (
          <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {stage.type && <EtiquetteForme forme={stage.type} />}
            <span className="truncate">{reperes.join(" · ")}</span>
          </p>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-xs">
          {aVenir.length > 0 ? (
            <>
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 bg-[var(--statut-en-ligne)]"
              />
              <span className="text-[var(--statut-en-ligne)]">
                {aVenir.length} date{aVenir.length > 1 ? "s" : ""} à venir —
                prochaine le {jourCourt.format(aVenir[0].dateDebut)}
              </span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 bg-[var(--statut-a-valider)]"
              />
              <span className="text-[var(--statut-a-valider)]">
                Aucune date à venir : le stage n&apos;apparaît pas sur la fiche
              </span>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onModifier}
        className={`${bouton.contour} shrink-0`}
      >
        Modifier
      </button>
    </article>
  );
}
