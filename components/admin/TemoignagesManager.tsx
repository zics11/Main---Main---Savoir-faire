"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import type { EtatTemoignages } from "@/app/admin/actions";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import { useModificationsEnCours } from "@/components/shared/ModificationsEnCours";
import type { Temoignage } from "@/lib/db/schema";
import { carte, champ, titre } from "@/lib/style";

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
 * Les témoignages publiés sur une fiche — ceux que les personnes ont déposés
 * en réponse à une demande. L'association les corrige ou les retire sur
 * place ; tout s'enregistre d'un geste depuis la barre du bas, comme la
 * fiche et les stages.
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

  const modifie = empreinte(lignes) !== empreinte(initiales);
  useModificationsEnCours("temoignages", modifie);

  const changer = (cle: string, modif: Partial<Ligne>) => {
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...modif } : l)));
    onMessage(null);
  };

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

      <div className={carte}>
        <h3 className={`mb-1 ${titre.carte}`}>
          Publiés sur la fiche
          <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
            {lignes.length}
          </span>
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Corrigez une faute ou retirez un témoignage, puis enregistrez.
        </p>
        <div className="flex flex-col gap-3">
          {lignes.map((l) => (
            <article
              key={l.cle}
              className="rounded-sm border border-border bg-background p-5"
            >
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Témoignage</span>
                <textarea
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
                    onChange={(e) =>
                      changer(l.cle, { contexte: e.target.value })
                    }
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
            <p className="text-sm text-muted-foreground">
              Aucun témoignage publié pour l&apos;instant : ils arrivent ici dès
              qu&apos;une personne répond à une demande.
            </p>
          )}
        </div>
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
