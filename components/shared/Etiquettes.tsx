import { DOMAINE_LABELS } from "@/lib/constants";
import type { Domaine } from "@/lib/db/schema";
import { etiquette, surtitre } from "@/lib/style";

// Deux repères qui reviennent partout, toujours écrits de la même façon :
// - la forme d'un stage (« Stage payant », « Aide bénévole »…) : une
//   étiquette, petit cadre terracotta ;
// - le domaine d'une fiche, suivi de son savoir-faire : des petites capitales
//   sans cadre, comme en tête de la fiche (« ARTISANAT · FORGE »).
// Ainsi on ne confond jamais l'un avec l'autre.

/**
 * La forme d'un stage : la même étiquette partout, sur une photo comme
 * ailleurs — un fond différent la faisait passer pour autre chose.
 */
export function EtiquetteForme({
  forme,
  className = "",
}: {
  forme: string;
  className?: string;
}) {
  return <span className={`${etiquette} ${className}`}>{forme}</span>;
}

/** Plusieurs formes, les premières en entier, le reste en « +2 ». */
export function ListeFormes({
  formes,
  max = 2,
}: {
  formes: string[];
  max?: number;
}) {
  if (formes.length === 0) return null;
  const reste = formes.slice(max);
  return (
    <span className="flex min-w-0 flex-wrap gap-1.5">
      {formes.slice(0, max).map((f) => (
        <EtiquetteForme key={f} forme={f} />
      ))}
      {reste.length > 0 && (
        <span title={reste.join(", ")} className={etiquette}>
          +{reste.length}
        </span>
      )}
    </span>
  );
}

/** « ARTISANAT · FORGE ET COUTELLERIE » : le domaine et le savoir-faire. */
export function DomaineSavoirFaire({
  domaine,
  savoirFaire,
  className = "",
}: {
  domaine: Domaine;
  savoirFaire?: string | null;
  className?: string;
}) {
  return (
    <div className={`${surtitre} ${className}`}>
      {DOMAINE_LABELS[domaine]}
      {savoirFaire ? ` · ${savoirFaire}` : ""}
    </div>
  );
}
