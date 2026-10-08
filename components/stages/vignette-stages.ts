import type { UpcomingStage } from "@/lib/queries";
import { dureeDuStage } from "@/lib/format";
import { bandeDate, etiquette } from "@/lib/style";
import { cn } from "@/lib/utils";

// La bulle d'un point sur la carte de la page Stages : la vignette de la
// liste, en compact — la photo et sa forme, puis une ligne par date avec la
// même bande calendrier. Un point par lieu : les dates d'un même endroit se
// superposeraient, une seule resterait cliquable. Construite en DOM natif :
// MapLibre gère ses bulles hors de React.

const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const numero = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
const mois = new Intl.DateTimeFormat("fr-FR", { month: "short" });

// Au-delà, la bulle déborderait de la carte : la fiche montre le reste.
const LIGNES_MAX = 4;

function el<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string,
  texte?: string,
) {
  const e = document.createElement(balise);
  e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

// Les icônes de durée et de prix de la liste (lucide « clock » et « tag »),
// redessinées ici : la bulle ne peut pas employer de composant React.
type Noeud = [string, Record<string, string>];
const HORLOGE: Noeud[] = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 6v6l4 2" }],
];
const ETIQUETTE_PRIX: Noeud[] = [
  [
    "path",
    {
      d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
    },
  ],
  ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }],
];

function icone(noeuds: Noeud[]) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const attributs: Record<string, string> = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    class: "h-3.5 w-3.5 shrink-0 text-primary/70",
  };
  for (const [k, v] of Object.entries(attributs)) svg.setAttribute(k, v);
  for (const [balise, props] of noeuds) {
    const n = document.createElementNS(ns, balise);
    for (const [k, v] of Object.entries(props)) n.setAttribute(k, v);
    svg.appendChild(n);
  }
  return svg;
}

/** Un repère, comme dans la liste : l'icône puis la valeur. */
function repere(noeuds: Noeud[], texte: string, classe: string) {
  const r = el("span", "flex items-center gap-1");
  r.append(icone(noeuds), el("span", classe, texte));
  return r;
}

// Au-delà, des carrés deviendraient illisibles : le texte suffit.
const CARRES_MAX = 12;

/** Les places, comme dans la liste : un carré par place, ■■□□. */
function places(restantes: number, total: number) {
  const ligne = el("span", "flex flex-wrap items-center gap-x-2 gap-y-1");
  if (total <= CARRES_MAX) {
    const carres = el("span", "flex gap-1");
    carres.setAttribute("aria-hidden", "true");
    for (let i = 0; i < total; i++) {
      carres.appendChild(
        el(
          "span",
          i < total - restantes
            ? "h-2 w-2 bg-muted-foreground/30"
            : "h-2 w-2 bg-[var(--statut-en-ligne)]",
        ),
      );
    }
    ligne.appendChild(carres);
  }
  ligne.appendChild(
    el(
      "span",
      restantes === 1
        ? "text-xs font-semibold text-[var(--statut-a-valider)]"
        : "text-xs text-[var(--statut-en-ligne)]",
      restantes === 1
        ? "Dernière place"
        : `${restantes} places libres sur ${total}`,
    ),
  );
  return ligne;
}

const sansPoint = (f: Intl.DateTimeFormat, d: Date) =>
  f.format(d).replace(/\./g, "");

/** La bande calendrier de la liste, resserrée. */
function bande(d: Date) {
  const b = el("div", cn(bandeDate.cadre, "w-14 gap-0.5 px-1 py-2"));
  b.append(
    el("span", bandeDate.mention, sansPoint(jour, d)),
    el("span", cn(bandeDate.numero, "text-2xl"), numero.format(d)),
    el("span", bandeDate.mention, sansPoint(mois, d)),
  );
  return b;
}

export function construireVignetteStages(dates: UpcomingStage[]) {
  const racine = el("div", "w-72 text-foreground");
  if (dates.length === 0) return racine;

  const triees = [...dates].sort(
    (a, b) => a.dateDebut.getTime() - b.dateDebut.getTime(),
  );
  const premier = triees[0];
  // Un seul stage à cet endroit : sa forme se pose sur la photo, comme dans
  // la liste. Plusieurs : chaque ligne porte la sienne.
  const unSeulStage = new Set(triees.map((d) => d.stageId)).size === 1;

  if (premier.photo) {
    const cadre = el("div", "relative h-24 w-full overflow-hidden");
    const img = el("img", "block h-full w-full object-cover");
    img.src = premier.photo;
    img.alt = premier.titre;
    cadre.appendChild(img);
    if (unSeulStage && premier.type) {
      cadre.appendChild(
        el("span", cn(etiquette, "absolute top-2 left-2"), premier.type),
      );
    }
    racine.appendChild(cadre);
  }

  for (const d of triees.slice(0, LIGNES_MAX)) {
    const ligne = el(
      "a",
      "flex border-t border-border text-foreground no-underline first-of-type:border-t-0 hover:bg-secondary hover:text-foreground",
    );
    ligne.href = `/fiche/${d.transmetteur.slug}#stage-${d.stageId}`;

    const texte = el(
      "div",
      "flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2",
    );
    texte.appendChild(
      el(
        "div",
        "truncate font-serif text-base leading-tight font-semibold",
        d.titre,
      ),
    );
    const reperes = el(
      "div",
      "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs",
    );
    if (!unSeulStage && d.type)
      reperes.appendChild(el("span", etiquette, d.type));
    reperes.appendChild(
      repere(
        HORLOGE,
        dureeDuStage(d.dateDebut, d.dateFin, d.duree),
        "text-foreground/80",
      ),
    );
    if (d.prix) {
      reperes.appendChild(
        repere(ETIQUETTE_PRIX, d.prix, "font-semibold text-primary"),
      );
    }
    texte.appendChild(reperes);
    if (d.places !== null) {
      texte.appendChild(places(d.places - d.inscrits, d.places));
    }

    ligne.append(
      bande(d.dateDebut),
      texte,
      el("span", "flex items-center pr-3 text-primary", "→"),
    );
    racine.appendChild(ligne);
  }

  if (triees.length > LIGNES_MAX) {
    const reste = triees.length - LIGNES_MAX;
    const lien = el(
      "a",
      "block border-t border-border px-3 py-2 text-xs font-semibold text-primary no-underline hover:bg-secondary",
    );
    lien.href = `/fiche/${premier.transmetteur.slug}`;
    lien.textContent = `Et ${reste} autre${reste > 1 ? "s" : ""} date${reste > 1 ? "s" : ""} sur la fiche →`;
    racine.appendChild(lien);
  }

  // Où, et chez qui : une seule fois pour tout le lieu.
  racine.appendChild(
    el(
      "div",
      "border-t border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground",
      `${premier.transmetteur.titre} · ${premier.transmetteur.lieuCourt}`,
    ),
  );
  return racine;
}
