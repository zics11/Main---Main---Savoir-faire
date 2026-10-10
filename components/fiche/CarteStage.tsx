import {
  CalendarDaysIcon,
  ClockIcon,
  GaugeIcon,
  InfoIcon,
  TagIcon,
} from "lucide-react";
import { ContactTrigger } from "@/components/contact/ContactModal";
import type { stageDates, stages } from "@/lib/db/schema";
import { dureeDuStage } from "@/lib/format";
import { lireDuree } from "@/lib/duree";
import { lireProgramme, programmeVide, type Programme } from "@/lib/programme";
import { EtiquetteForme } from "@/components/shared/Etiquettes";
import { bouton, intitule } from "@/lib/style";
import { Places, Repere, VignetteDate } from "./ReperesStage";
import { FriseProgramme } from "./FriseProgramme";
import { ProgrammeParJour } from "./ProgrammeParJour";
import { StageCouverture } from "./StageCouverture";

type Stage = typeof stages.$inferSelect & {
  dates: (typeof stageDates.$inferSelect)[];
};

/**
 * Un stage tel qu'il se présente sur la fiche publique : la photo d'abord,
 * puis l'essentiel d'un coup d'œil (durée, niveau, prix), le déroulé, et les
 * dates pour demander une place.
 */
export function CarteStage({ stage: g }: { stage: Stage }) {
  const programme = lireProgramme(g.programme);
  return (
    <article
      // Ancre visée depuis la page Stages, pour arriver directement sur le
      // bon stage.
      id={`stage-${g.id}`}
      className="overflow-hidden rounded-sm border border-border bg-card shadow-sm"
    >
      <StageCouverture photos={g.photos} alt={g.titre} forme={g.type} />

      <div className="p-6">
        {/* Sans photo, la forme du stage n'a pas où se poser : elle passe
            au-dessus du titre. */}
        {g.photos.length === 0 && g.type && (
          <EtiquetteForme forme={g.type} className="mb-3" />
        )}
        <h3 className="font-serif text-2xl leading-tight font-semibold">
          {g.titre}
        </h3>

        {(g.duree || g.niveau || g.prix) && (
          <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {g.duree && (
              <Repere icone={<ClockIcon />} libelle="Durée">
                {g.duree}
              </Repere>
            )}
            {g.niveau && (
              <Repere icone={<GaugeIcon />} libelle="Niveau">
                {g.niveau}
              </Repere>
            )}
            {g.prix && (
              <Repere icone={<TagIcon />} libelle="Prix" fort>
                {g.prix}
              </Repere>
            )}
          </dl>
        )}

        {g.description && (
          <p className="mt-4 leading-relaxed text-foreground/85">
            {g.description}
          </p>
        )}
      </div>

      {!programmeVide(programme) && (
        <div className="border-t border-border px-6 py-5">
          <h4 className={`mb-4 font-sans ${intitule}`}>
            {intituleProgramme(g.duree, programme)}
          </h4>
          {programme.type === "journee" ? (
            <FriseProgramme moments={programme.moments} />
          ) : (
            <ProgrammeParJour jours={programme.jours} />
          )}
        </div>
      )}

      {/* Les dates ferment la carte : c'est ici qu'on demande une place. Un
          fond à part et un intitulé en couleur les détachent du reste. */}
      <div className="border-t border-primary/20 bg-accent/50 px-6 py-5">
        <h4 className="mb-1 flex items-center gap-2 font-sans text-xs font-semibold tracking-wider text-primary uppercase">
          <CalendarDaysIcon aria-hidden className="h-4 w-4" />
          {g.dates.length > 1 ? "Prochaines dates" : "Prochaine date"}
        </h4>
        <ul>
          {g.dates.map((d) => (
            <LigneDate key={d.id} stageId={g.id} duree={g.duree} date={d} />
          ))}
        </ul>
        {g.note && (
          <p className="mt-2 flex gap-2 border-t border-primary/15 pt-4 text-xs leading-relaxed text-foreground/70">
            <InfoIcon aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
            {g.note}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * Une date, comme sur un calendrier : la vignette carrée du premier jour à
 * gauche, la durée et les places au milieu, la demande à droite. La date de
 * fin ne s'affiche pas — elle découle de la durée, commune au stage. Sur
 * téléphone, la demande passe dessous, en pleine largeur.
 */
function LigneDate({
  stageId,
  duree,
  date: d,
}: {
  stageId: string;
  /** Durée du stage, la même pour toutes ses dates. */
  duree: string | null;
  date: typeof stageDates.$inferSelect;
}) {
  const restantes = d.places !== null ? d.places - d.inscrits : null;
  const complet = restantes !== null && restantes <= 0;

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-primary/15 py-3.5 last:border-b-0 ${
        complet ? "opacity-60" : ""
      }`}
    >
      <VignetteDate date={d.dateDebut} />

      {/* Une base minimale : quand elle ne tient plus à côté du bouton, c'est
          le bouton qui passe à la ligne, pas le texte qui s'écrase. */}
      <div className="min-w-0 grow basis-40">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <ClockIcon aria-hidden className="h-4 w-4 text-primary/70" />
          {dureeDuStage(d.dateDebut, d.dateFin, duree)}
        </div>
        {restantes !== null && d.places !== null && !complet && (
          <div className="mt-1 text-xs">
            <Places restantes={restantes} total={d.places} />
          </div>
        )}
      </div>

      {complet ? (
        <span className="w-full shrink-0 rounded-sm border border-input bg-card px-2 py-1 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-auto">
          Complet
        </span>
      ) : (
        <ContactTrigger
          stageId={stageId}
          dateId={d.id}
          className={`${bouton.primaire} w-full shrink-0 sm:w-auto`}
        >
          Demander
        </ContactTrigger>
      )}
    </li>
  );
}

/**
 * Le titre du programme. Jour par jour, il le dit ; sinon, le programme
 * décrit une journée : celle du stage, ou une journée type s'il en compte
 * plusieurs. Pour quelques heures, c'est simplement le programme.
 */
function intituleProgramme(duree: string | null, programme: Programme) {
  if (programme.type === "par-jour") return "Le programme, jour par jour";
  const d = lireDuree(duree);
  if (d?.unite === "heure") return "Le programme";
  return d && (d.unite === "semaine" || d.nombre > 1)
    ? "Une journée type"
    : "Le programme de la journée";
}
