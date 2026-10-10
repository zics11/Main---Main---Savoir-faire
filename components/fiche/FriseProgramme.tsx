import { heureLisible, type Moment } from "@/lib/programme";

/**
 * Le déroulé d'une journée en frise : un point par moment, reliés par un fil
 * — on lit de haut en bas, l'heure en tête de ligne.
 */
export function FriseProgramme({ moments }: { moments: Moment[] }) {
  return (
    <ol className="ml-1 border-l border-primary/25">
      {moments.map((m, i) => (
        <li key={i} className="relative flex pb-3.5 pl-5 last:pb-0">
          <span
            aria-hidden
            className="absolute top-[7px] -left-[4.5px] h-2 w-2 bg-primary ring-4 ring-card"
          />
          <span className="mr-2.5 w-12 shrink-0 text-xs leading-5 font-semibold text-primary tabular-nums">
            {m.heure && heureLisible(m.heure)}
          </span>
          <span className="text-sm text-foreground/90">{m.titre}</span>
        </li>
      ))}
    </ol>
  );
}
