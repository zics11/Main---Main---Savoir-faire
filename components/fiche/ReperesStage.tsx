import { bandeDate } from "@/lib/style";

// Les pièces d'un stage qui s'affichent à l'identique sur la fiche et sur la
// page Stages : les repères (durée, niveau, prix) avec leur icône, la
// vignette calendrier d'une date, et les places en petits carrés.

const jourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const numero = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
const moisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short" });

// Au-delà, des carrés deviendraient illisibles : le texte suffit.
const CARRES_MAX = 12;

/** Un repère du stage : une icône, la valeur, et son nom pour les lecteurs d'écran. */
export function Repere({
  icone,
  libelle,
  fort = false,
  children,
}: {
  icone: React.ReactElement;
  libelle: string;
  fort?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="sr-only">{libelle}</dt>
      <span aria-hidden className="text-primary/70 [&>svg]:h-4 [&>svg]:w-4">
        {icone}
      </span>
      <dd
        className={fort ? "font-semibold text-primary" : "text-foreground/80"}
      >
        {children}
      </dd>
    </div>
  );
}

/** Le premier jour d'une date, comme sur un calendrier : SAM / 14 / NOV. */
export function VignetteDate({
  date,
  className = "",
}: {
  date: Date;
  className?: string;
}) {
  const court = (f: Intl.DateTimeFormat) => f.format(date).replace(".", "");
  return (
    <div
      className={`flex w-14 shrink-0 flex-col items-center rounded-sm border border-primary/20 bg-card py-1.5 leading-none text-primary ${className}`}
    >
      <span className="text-[10px] tracking-wide uppercase">
        {court(jourCourt)}
      </span>
      <span className="my-1 text-xl font-semibold tabular-nums">
        {numero.format(date)}
      </span>
      <span className="text-[10px] tracking-wide uppercase">
        {court(moisCourt)}
      </span>
    </div>
  );
}

/**
 * La même date, en bande sur toute la hauteur d'une carte : la première
 * chose qu'on lit dans une liste de dates (page Stages).
 */
export function BandeDate({ date }: { date: Date }) {
  const court = (f: Intl.DateTimeFormat) => f.format(date).replace(".", "");
  return (
    <div className={bandeDate.cadre}>
      <span className={bandeDate.mention}>{court(jourCourt)}</span>
      <span className={bandeDate.numero}>{numero.format(date)}</span>
      <span className={bandeDate.mention}>{court(moisCourt)}</span>
    </div>
  );
}

/** Les places, en petits carrés quand elles sont peu nombreuses : ■■□□. */
export function Places({
  restantes,
  total,
}: {
  restantes: number;
  total: number;
}) {
  if (restantes <= 0) {
    return (
      <span className="rounded-sm border border-input bg-card px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Complet
      </span>
    );
  }
  const texte =
    restantes === 1
      ? "Dernière place"
      : `${restantes} places libres sur ${total}`;

  return (
    <span className="flex items-center gap-2">
      {total <= CARRES_MAX && (
        <span aria-hidden className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 ${
                i < total - restantes
                  ? "bg-muted-foreground/30"
                  : "bg-[var(--statut-en-ligne)]"
              }`}
            />
          ))}
        </span>
      )}
      <span
        className={`text-xs ${
          restantes === 1
            ? "font-semibold text-[var(--statut-a-valider)]"
            : "text-[var(--statut-en-ligne)]"
        }`}
      >
        {texte}
      </span>
    </span>
  );
}
