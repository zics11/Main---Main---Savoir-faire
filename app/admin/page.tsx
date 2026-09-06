import { asc, like, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { transmetteurs } from "@/lib/db/schema";
import { DOMAINE_LABELS } from "@/lib/constants";
import { togglePubliee } from "./actions";

export default async function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const fiches = await db.query.transmetteurs.findMany({
    where: query
      ? or(
          like(transmetteurs.nom, `%${query}%`),
          like(transmetteurs.savoirFaire, `%${query}%`),
          like(transmetteurs.lieuApproximatif, `%${query}%`)
        )
      : undefined,
    orderBy: [asc(transmetteurs.nom)],
  });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="mb-1 font-serif text-3xl font-semibold">
            Toutes les fiches
          </h1>
          <p className="text-sm text-muted-foreground">
            {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/fiches/nouvelle"
          className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
        >
          + Créer une fiche
        </Link>
      </div>

      <form className="mb-5" action="/admin">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Chercher un nom, un savoir-faire, un lieu…"
          className="w-full max-w-md rounded-sm border border-input bg-card px-3 py-2.5 text-sm"
        />
      </form>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <div className="grid grid-cols-[1.4fr_1fr_100px_90px_140px] gap-3 border-b border-border bg-secondary px-4 py-3 text-xs tracking-wide text-muted-foreground uppercase">
          <span>Fiche</span>
          <span>Savoir-faire</span>
          <span>Domaine</span>
          <span>Statut</span>
          <span />
        </div>
        {fiches.map((f) => (
          <div
            key={f.id}
            className="grid grid-cols-[1.4fr_1fr_100px_90px_140px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
          >
            <div>
              <div className="font-medium">{f.nom}</div>
              <div className="text-xs text-muted-foreground">
                {f.lieuApproximatif}
              </div>
            </div>
            <div className="text-sm">{f.savoirFaire}</div>
            <div className="text-xs">{DOMAINE_LABELS[f.domaine]}</div>
            <span
              className={`w-fit rounded-sm px-2 py-1 text-[11px] uppercase ${
                f.publiee
                  ? "bg-success text-success-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {f.publiee ? "Publiée" : "Masquée"}
            </span>
            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/admin/fiches/${f.id}`}
                className="text-xs font-semibold text-primary"
              >
                Éditer
              </Link>
              <form action={togglePubliee.bind(null, f.id)}>
                <button
                  type="submit"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {f.publiee ? "Masquer" : "Publier"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {fiches.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune fiche ne correspond.
          </div>
        )}
      </div>
    </div>
  );
}
