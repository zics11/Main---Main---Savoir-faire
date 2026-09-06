import type { Temoignage } from "@/lib/db/schema";
import { createTemoignage, deleteTemoignage } from "@/app/admin/actions";

const inputClass =
  "w-full rounded-sm border border-input bg-card px-2.5 py-2 text-sm";

export function TemoignagesManager({
  transmetteurId,
  temoignages,
}: {
  transmetteurId: string;
  temoignages: Temoignage[];
}) {
  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-1 font-serif text-xl font-semibold">Témoignages</h2>
      <p className="mb-5 text-xs text-muted-foreground">
        Pas de dépôt public — vous les recueillez vous-même (par email, à
        l&apos;oral…) et les ajoutez ici.
      </p>

      <div className="flex flex-col gap-3">
        {temoignages.map((t) => (
          <div
            key={t.id}
            className="rounded-sm border border-border bg-secondary p-4"
          >
            <p className="mb-2 text-sm text-foreground/90 italic">
              « {t.texte} »
            </p>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {t.auteur} — {t.contexte}
              </span>
              <form action={deleteTemoignage.bind(null, transmetteurId, t.id)}>
                <button type="submit" className="hover:text-destructive">
                  Retirer
                </button>
              </form>
            </div>
          </div>
        ))}
        {temoignages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun témoignage pour cette fiche.
          </p>
        )}
      </div>

      <details className="mt-5 rounded-sm border border-dashed border-input p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          + Ajouter un témoignage
        </summary>
        <form
          action={createTemoignage.bind(null, transmetteurId)}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Texte
            <textarea name="texte" rows={2} required className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Auteur
              <input name="auteur" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Contexte
              <input
                name="contexte"
                placeholder="ex : stage, mai 2026"
                required
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-1 w-fit rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[#8a4222]"
          >
            Ajouter
          </button>
        </form>
      </details>
    </section>
  );
}
