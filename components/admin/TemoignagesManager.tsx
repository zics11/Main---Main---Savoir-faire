"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { EtatTemoignages } from "@/app/admin/actions";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import { useModificationsEnCours } from "@/components/shared/ModificationsEnCours";
import type { Temoignage } from "@/lib/db/schema";
import { bouton, champ } from "@/lib/style";

type Ligne = {
  cle: string;
  id: string | null;
  texte: string;
  auteur: string;
  contexte: string;
};

type Action = (
  precedent: EtatTemoignages,
  formData: FormData,
) => Promise<EtatTemoignages>;

let compteur = 0;


function depuis(temoignages: Temoignage[]): Ligne[] {
  return temoignages.map((t) => ({
    cle: t.id,
    id: t.id,
    texte: t.texte,
    auteur: t.auteur,
    contexte: t.contexte,
  }));
}

/** Ce qui compte pour savoir si la liste a changé — sans les clés d'édition. */
function empreinte(lignes: Ligne[]) {
  return JSON.stringify(
    lignes.map(({ id, texte, auteur, contexte }) => ({
      id,
      texte: texte.trim(),
      auteur: auteur.trim(),
      contexte: contexte.trim(),
    })),
  );
}

/**
 * Les témoignages d'une fiche, recueillis par l'association. On les écrit,
 * les corrige ou les retire sur place ; tout s'enregistre d'un geste depuis
 * la barre du bas, comme la fiche et les stages.
 */
export function TemoignagesManager({
  temoignages,
  enregistrer,
}: {
  temoignages: Temoignage[];
  enregistrer: Action;
}) {
  // Une fois enregistrée, la liste repart de ce qui est en base (les
  // nouveaux témoignages y ont reçu leur identifiant).
  const signature = empreinte(depuis(temoignages));
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(
    null,
  );
  return (
    <EditeurTemoignages
      key={signature}
      temoignages={temoignages}
      enregistrer={enregistrer}
      message={message}
      onMessage={setMessage}
    />
  );
}

function EditeurTemoignages({
  temoignages,
  enregistrer,
  message,
  onMessage,
}: {
  temoignages: Temoignage[];
  enregistrer: Action;
  message: { ok: boolean; texte: string } | null;
  onMessage: (m: { ok: boolean; texte: string } | null) => void;
}) {
  const initiales = useMemo(() => depuis(temoignages), [temoignages]);
  const [lignes, setLignes] = useState(initiales);
  const [enCours, demarrer] = useTransition();
  const premierChamp = useRef<HTMLTextAreaElement>(null);

  const modifie = empreinte(lignes) !== empreinte(initiales);
  useModificationsEnCours("temoignages", modifie);

  const changer = (cle: string, modif: Partial<Ligne>) => {
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...modif } : l)));
    onMessage(null);
  };

  function ajouter() {
    // Le nouveau en tête : on l'écrit tout de suite, sans chercher où il est.
    setLignes((ls) => [
      {
        cle: `nouveau-${++compteur}`,
        id: null,
        texte: "",
        auteur: "",
        contexte: "",
      },
      ...ls,
    ]);
    onMessage(null);
    setTimeout(() => premierChamp.current?.focus(), 0);
  }

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    demarrer(async () => {
      try {
        const r = await enregistrer(null, donnees);
        if (r?.ok) onMessage({ ok: true, texte: "Témoignages enregistrés." });
        else if (r) onMessage({ ok: false, texte: r.erreur });
      } catch {
        onMessage({
          ok: false,
          texte:
            "L'enregistrement n'a pas abouti. Vérifiez la connexion et réessayez.",
        });
      }
    });
  }

  return (
    <form onSubmit={envoyer}>
      <input
        type="hidden"
        name="temoignages"
        value={JSON.stringify(
          lignes.map(({ id, texte, auteur, contexte }) => ({
            id,
            texte,
            auteur,
            contexte,
          })),
        )}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Témoignages</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Pas de dépôt public : vous les recueillez vous-même (par email, à
            l&apos;oral…) et les ajoutez ici.
          </p>
        </div>
        <button
          type="button"
          onClick={ajouter}
          className={`${bouton.primaire} flex items-center gap-1.5`}
        >
          <PlusIcon aria-hidden className="h-4 w-4" />
          Ajouter un témoignage
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {lignes.map((l, i) => (
          <article
            key={l.cle}
            className={`rounded-sm border bg-card p-5 ${
              l.id === null ? "border-2 border-primary/50" : "border-border"
            }`}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">
                {l.id === null ? "Nouveau témoignage" : "Témoignage"}
              </span>
              <textarea
                ref={i === 0 ? premierChamp : undefined}
                value={l.texte}
                onChange={(e) => changer(l.cle, { texte: e.target.value })}
                rows={3}
                placeholder="Ce que la personne a dit de son passage…"
                className="w-full rounded-sm border border-input bg-card px-3 py-2.5 font-serif text-base italic"
              />
            </label>
            <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Auteur</span>
                <input
                  value={l.auteur}
                  onChange={(e) => changer(l.cle, { auteur: e.target.value })}
                  placeholder="ex : Camille"
                  className={champ}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Contexte</span>
                <input
                  value={l.contexte}
                  onChange={(e) => changer(l.cle, { contexte: e.target.value })}
                  placeholder="ex : stage, mai 2026"
                  className={champ}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setLignes((ls) => ls.filter((x) => x.cle !== l.cle));
                  onMessage(null);
                }}
                aria-label="Retirer ce témoignage"
                title="Retirer ce témoignage"
                className="flex h-10 items-center justify-center gap-1.5 justify-self-start rounded-sm px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <Trash2Icon aria-hidden className="h-4 w-4" />
                <span className="sm:sr-only">Retirer</span>
              </button>
            </div>
          </article>
        ))}

        {lignes.length === 0 && (
          <div className="rounded-sm border border-dashed border-input bg-card px-6 py-10 text-center">
            <p className="font-serif text-xl font-semibold">
              Aucun témoignage pour cette fiche
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez le premier : il apparaîtra sur la fiche publique.
            </p>
          </div>
        )}
      </div>

      <BarreEnregistrement
        modifie={modifie}
        enCours={enCours}
        erreur={message && !message.ok ? message.texte : null}
        info={message?.ok ? message.texte : null}
        enregistrer={{ libelle: "Enregistrer" }}
      />
    </form>
  );
}
