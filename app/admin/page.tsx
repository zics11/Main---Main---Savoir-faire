import { like, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { transmetteurs } from "@/lib/db/schema";
import { DOMAINE_LABELS } from "@/lib/constants";
import { togglePubliee } from "./actions";

type Fiche = typeof transmetteurs.$inferSelect;

// Chaque état a sa couleur (définie dans globals.css), reprise telle quelle
// sur l'onglet correspondant.
const ETATS = {
  enLigne: { label: "En ligne", teinte: "en-ligne" },
  aValider: { label: "À valider", teinte: "a-valider" },
  horsLigne: { label: "Hors ligne", teinte: "hors-ligne" },
  enCours: { label: "En cours", teinte: "en-cours" },
  bloquee: { label: "Bloquée", teinte: "bloquee" },
} as const;

function couleurs(teinte: string) {
  return {
    trait: `var(--statut-${teinte})`,
    fond: `var(--statut-${teinte}-fond)`,
  };
}

/**
 * Cinq situations, dans l'ordre où elles priment : une fiche suspendue par
 * l'association, une fiche en ligne, une demande en attente, une fiche déjà
 * validée que le transmetteur a retirée, et une fiche jamais soumise.
 */
function etatDe(f: Fiche) {
  if (f.bloqueeLe) return "bloquee" as const;
  if (f.publiee) return "enLigne" as const;
  if (f.publicationDemandeeLe) return "aValider" as const;
  return f.premiereValidationLe ? ("horsLigne" as const) : ("enCours" as const);
}

const ONGLETS = [
  "toutes",
  "enLigne",
  "aValider",
  "horsLigne",
  "enCours",
  "bloquee",
] as const;
type Onglet = (typeof ONGLETS)[number];

const LIBELLES_ONGLETS: Record<Onglet, string> = {
  toutes: "Toutes",
  enLigne: "En ligne",
  aValider: "À valider",
  horsLigne: "Hors ligne",
  enCours: "En cours",
  bloquee: "Bloquées",
};

function estOnglet(v: string): v is Onglet {
  return (ONGLETS as readonly string[]).includes(v);
}

function Etat({ fiche }: { fiche: Fiche }) {
  const { label, teinte } = ETATS[etatDe(fiche)];
  const { trait } = couleurs(teinte);
  return (
    <span
      style={{ backgroundColor: trait }}
      className="w-fit rounded-sm px-2 py-1 text-[11px] font-medium text-white uppercase"
    >
      {label}
    </span>
  );
}

// Le tri se fait en mémoire : SQLite compare les octets, ce qui range « Élise »
// après « Z » et sépare majuscules et minuscules. La liste tient largement en
// mémoire, et l'ordre affiché est celui qu'on attend en français.
const collateur = new Intl.Collator("fr", { sensitivity: "base" });

const COLONNES = {
  nom: (f: Fiche) => f.nom,
  savoirFaire: (f: Fiche) => f.savoirFaire,
  domaine: (f: Fiche) => DOMAINE_LABELS[f.domaine],
  statut: (f: Fiche) => Object.keys(ETATS).indexOf(etatDe(f)),
  modifiee: (f: Fiche) => f.updatedAt.getTime(),
} as const;

type Colonne = keyof typeof COLONNES;

function estColonne(v: string): v is Colonne {
  return v in COLONNES;
}

function comparer(a: Fiche, b: Fiche, colonne: Colonne) {
  const va = COLONNES[colonne](a);
  const vb = COLONNES[colonne](b);
  // Les fiches incomplètes (valeur nulle) restent groupées en fin de liste.
  if (va === null) return vb === null ? 0 : 1;
  if (vb === null) return -1;
  return typeof va === "number" && typeof vb === "number"
    ? va - vb
    : collateur.compare(String(va), String(vb));
}

/** En-tête cliquable : même colonne = on inverse le sens, sinon on repart en
 *  ordre croissant. La recherche en cours est conservée. */
function EnTeteTri({
  colonne,
  label,
  triActif,
  sensActif,
  q,
  onglet,
  className,
}: {
  colonne: Colonne;
  label: string;
  triActif: Colonne;
  sensActif: "asc" | "desc";
  q: string;
  onglet: Onglet;
  className?: string;
}) {
  const actif = triActif === colonne;
  const sens = actif && sensActif === "asc" ? "desc" : "asc";
  const params = new URLSearchParams({ tri: colonne, sens });
  if (q) params.set("q", q);
  if (onglet !== "toutes") params.set("onglet", onglet);

  return (
    <Link
      href={`/admin?${params}`}
      className={`flex items-center gap-1 hover:text-foreground ${
        actif ? "text-foreground" : ""
      } ${className ?? ""}`}
    >
      {label}
      <span aria-hidden className={actif ? "" : "opacity-30"}>
        {actif && sensActif === "desc" ? "↓" : "↑"}
      </span>
    </Link>
  );
}

export default async function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  const { q, tri, sens, onglet } = await searchParams;
  const ongletActif: Onglet =
    typeof onglet === "string" && estOnglet(onglet) ? onglet : "toutes";
  const query = typeof q === "string" ? q.trim() : "";
  const colonne: Colonne =
    typeof tri === "string" && estColonne(tri) ? tri : "nom";
  const sensTri = sens === "desc" ? "desc" : "asc";

  const recherche = query
    ? or(
        like(transmetteurs.nom, `%${query}%`),
        like(transmetteurs.savoirFaire, `%${query}%`),
        like(transmetteurs.lieuApproximatif, `%${query}%`)
      )
    : undefined;
  const toutes = await db.query.transmetteurs.findMany({ where: recherche });

  // Deux blocs distincts : ce qui attend une décision de l'association, et le
  // reste. Rien ne paraît en ligne sans ce passage-là.
  const aValider = toutes
    .filter((f) => etatDe(f) === "aValider")
    .sort((a, b) => collateur.compare(a.nom, b.nom));
  const listees = toutes
    .filter((f) => ongletActif === "toutes" || etatDe(f) === ongletActif)
    .sort((a, b) => {
      const ordre = comparer(a, b, colonne);
      // À valeur égale, on retombe toujours sur l'ordre alphabétique.
      return (sensTri === "desc" ? -ordre : ordre) || collateur.compare(a.nom, b.nom);
    });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="mb-1 font-serif text-3xl font-semibold">
            Les fiches
          </h1>
          <p className="text-sm text-muted-foreground">
            {toutes.length} fiche{toutes.length > 1 ? "s" : ""}
            {aValider.length > 0 &&
              `, dont ${aValider.length} en attente de votre accord`}
          </p>
        </div>
        <Link
          href="/admin/fiches/nouvelle"
          className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
        >
          + Créer une fiche
        </Link>
      </div>

      {aValider.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-sm border border-primary bg-accent">
          <div className="border-b border-primary/30 px-4 py-3">
            <h2 className="font-serif text-lg font-semibold">
              Demandes de publication ({aValider.length})
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Ces transmetteurs ont terminé leur fiche et attendent votre
              accord. Rien n&apos;est visible du public d&apos;ici là.
            </p>
          </div>
          {aValider.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 px-4 py-3 text-sm last:border-b-0"
              >
                <div>
                  <div className="font-medium">{f.nom}</div>
                  <div className="text-xs text-muted-foreground">
                    Demandée le{" "}
                    {f.publicationDemandeeLe?.toLocaleDateString("fr-FR")} ·{" "}
                    {DOMAINE_LABELS[f.domaine]} · {f.savoirFaire}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/fiches/${f.id}`}
                    className="text-xs font-semibold text-primary"
                  >
                    Voir la fiche
                  </Link>
                  <form action={togglePubliee.bind(null, f.id)}>
                    <button
                      type="submit"
                      className="rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-[#8a4222]"
                    >
                      Publier
                    </button>
                  </form>
                </div>
              </div>
          ))}
        </section>
      )}

      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {ONGLETS.map((o) => {
          const compte =
            o === "toutes"
              ? toutes.length
              : toutes.filter((f) => etatDe(f) === o).length;
          const params = new URLSearchParams({ tri: colonne, sens: sensTri });
          if (query) params.set("q", query);
          if (o !== "toutes") params.set("onglet", o);
          const actif = ongletActif === o;
          const etat = o === "toutes" ? null : ETATS[o];
          const { trait, fond } = etat
            ? couleurs(etat.teinte)
            : { trait: "var(--primary)", fond: "var(--accent)" };

          return (
            <Link
              key={o}
              role="tab"
              aria-selected={actif}
              href={`/admin?${params}`}
              style={
                actif
                  ? { borderColor: trait, backgroundColor: trait, color: "#fff" }
                  : { borderColor: trait, backgroundColor: fond, color: trait }
              }
              className="flex items-center gap-1.5 rounded-sm border px-5 py-2.5 text-sm font-semibold"
            >
              {LIBELLES_ONGLETS[o]}
              <span className="opacity-70">{compte}</span>
            </Link>
          );
        })}
      </div>

      <form className="mb-5" action="/admin">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Chercher un nom, un savoir-faire, un lieu…"
          className="w-full max-w-md rounded-sm border border-input bg-card px-3 py-2.5 text-sm"
        />
        {/* Le tri et l'onglet en cours survivent à une nouvelle recherche. */}
        <input type="hidden" name="tri" value={colonne} />
        <input type="hidden" name="sens" value={sensTri} />
        {ongletActif !== "toutes" && (
          <input type="hidden" name="onglet" value={ongletActif} />
        )}
      </form>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <div className="grid grid-cols-[1.4fr_1fr_100px_110px_110px_90px] gap-3 border-b border-border bg-secondary px-4 py-3 text-xs tracking-wide text-muted-foreground uppercase">
          {(
            [
              ["nom", "Fiche"],
              ["savoirFaire", "Savoir-faire"],
              ["domaine", "Domaine"],
              ["statut", "Statut"],
              ["modifiee", "Modifiée"],
            ] as [Colonne, string][]
          ).map(([c, label]) => (
            <EnTeteTri
              key={c}
              colonne={c}
              label={label}
              triActif={colonne}
              sensActif={sensTri}
              q={query}
              onglet={ongletActif}
            />
          ))}
          <span />
        </div>
        {listees.map((f) => (
          <div
            key={f.id}
            className={`grid grid-cols-[1.4fr_1fr_100px_110px_110px_90px] items-center gap-3 border-b border-border border-l-3 px-4 py-3 text-sm last:border-b-0 ${
              f.publiee ? "border-l-transparent" : "border-l-primary bg-secondary/40"
            }`}
          >
            <div>
              <div className="font-medium">{f.nom}</div>
              <div className="text-xs text-muted-foreground">
                {f.lieuApproximatif ?? "Lieu à renseigner"}
              </div>
            </div>
            <div className="text-sm">
              {f.savoirFaire ?? (
                <span className="text-muted-foreground">
                  Savoir-faire à renseigner
                </span>
              )}
            </div>
            <div className="text-xs">{DOMAINE_LABELS[f.domaine]}</div>
            <Etat fiche={f} />
            <div className="text-xs text-muted-foreground">
              {f.updatedAt.toLocaleDateString("fr-FR")}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/admin/fiches/${f.id}`}
                className="text-xs font-semibold text-primary"
              >
                Éditer
              </Link>
              {/* Publier, masquer et bloquer se décident depuis la fiche
                  elle-même, où l'on voit ce qu'on met en ligne. */}
            </div>
          </div>
        ))}
        {listees.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune fiche dans cet onglet.
          </div>
        )}
      </div>
    </div>
  );
}
