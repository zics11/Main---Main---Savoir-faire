import type { Stage, StageDate } from "@/lib/db/schema";
import { NIVEAUX_STAGE, TYPES_TRANSMISSION } from "@/lib/constants";
import { PhotosField } from "@/components/shared/PhotosField";
import {
  createStage,
  createStageDate,
  deleteStage,
  deleteStageDate,
  updateStage,
  updateStageDate,
} from "@/app/admin/actions";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function programmeToLines(programme: { heure: string; titre: string }[]) {
  return programme.map((p) => `${p.heure} | ${p.titre}`).join("\n");
}

const inputClass =
  "w-full rounded-sm border border-input bg-card px-2.5 py-2 text-sm";
const smallInputClass =
  "w-full rounded-sm border border-input bg-card px-2 py-1.5 text-xs";
const labelClass = "flex flex-col gap-1 text-xs text-muted-foreground";
const smallLabelClass = "flex flex-col gap-1 text-[11px] text-muted-foreground";

function StageFields({ stage }: { stage?: Stage }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Intitulé
          <input
            name="titre"
            defaultValue={stage?.titre}
            required
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Forme de transmission
          <select
            name="type"
            defaultValue={stage?.type ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {TYPES_TRANSMISSION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Niveau
          <select
            name="niveau"
            defaultValue={stage?.niveau ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {NIVEAUX_STAGE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Durée (ex : 2 jours)
          <input name="duree" defaultValue={stage?.duree ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Prix / contrepartie (ex : 180 € / pers., Échange, Troc)
          <input name="prix" defaultValue={stage?.prix ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={`mt-3 ${labelClass}`}>
        Description
        <textarea
          name="description"
          defaultValue={stage?.description}
          rows={2}
          className={inputClass}
        />
      </label>
      <label className={`mt-3 ${labelClass}`}>
        Programme de la journée (optionnel — une ligne par créneau, format
        &quot;heure | titre&quot;, ex : &quot;7 h | Rafraîchi du levain&quot;)
        <textarea
          name="programme"
          defaultValue={stage ? programmeToLines(stage.programme) : ""}
          rows={4}
          placeholder={"7 h | Rafraîchi du levain\n9 h | Pétrissage à la main"}
          className={inputClass}
        />
      </label>
      <label className={`mt-3 ${labelClass}`}>
        Note (optionnel — précisions pratiques affichées sous les dates)
        <input name="note" defaultValue={stage?.note ?? ""} className={inputClass} />
      </label>
      <div className="mt-3">
        <div className={`mb-1.5 ${labelClass}`}>Photos de ce stage</div>
        <PhotosField existingPhotos={stage?.photos ?? []} />
      </div>
    </>
  );
}

function DateFields({ date }: { date?: StageDate }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:items-end">
      <label className={smallLabelClass}>
        Du
        <input
          type="date"
          name="dateDebut"
          required
          defaultValue={date ? toDateInputValue(date.dateDebut) : undefined}
          className={smallInputClass}
        />
      </label>
      <label className={smallLabelClass}>
        Au
        <input
          type="date"
          name="dateFin"
          required
          defaultValue={date ? toDateInputValue(date.dateFin) : undefined}
          className={smallInputClass}
        />
      </label>
      <label className={smallLabelClass}>
        Places
        <input
          type="number"
          name="places"
          min={0}
          defaultValue={date?.places ?? ""}
          className={smallInputClass}
        />
      </label>
      <label className={smallLabelClass}>
        Inscrits
        <input
          type="number"
          name="inscrits"
          min={0}
          defaultValue={date?.inscrits ?? 0}
          className={smallInputClass}
        />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          name="publiee"
          defaultChecked={date?.publiee ?? true}
          className="accent-primary"
        />
        Publiée
      </label>
    </div>
  );
}

function DatesList({
  transmetteurId,
  stage,
}: {
  transmetteurId: string;
  stage: Stage & { dates: StageDate[] };
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border bg-secondary/40 p-4">
      {stage.dates.map((date) => (
        <form
          key={date.id}
          action={updateStageDate.bind(null, transmetteurId, date.id)}
          className="flex flex-col gap-2 rounded-sm border border-border bg-card p-3"
        >
          <DateFields date={date} />
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="rounded-sm border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-accent"
            >
              Enregistrer
            </button>
            <button
              type="submit"
              formAction={deleteStageDate.bind(null, transmetteurId, date.id)}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              Supprimer cette date
            </button>
          </div>
        </form>
      ))}
      {stage.dates.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune date pour ce stage.</p>
      )}

      <details className="rounded-sm border border-dashed border-input p-3">
        <summary className="cursor-pointer text-xs font-medium text-primary">
          + Ajouter une date
        </summary>
        <form
          action={createStageDate.bind(null, transmetteurId, stage.id)}
          className="mt-3 flex flex-col gap-2"
        >
          <DateFields />
          <button
            type="submit"
            className="w-fit rounded-sm bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-[#8a4222]"
          >
            Ajouter cette date
          </button>
        </form>
      </details>
    </div>
  );
}

export function StagesManager({
  transmetteurId,
  stages,
}: {
  transmetteurId: string;
  stages: (Stage & { dates: StageDate[] })[];
}) {
  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <h2 className="mb-1 font-serif text-xl font-semibold">
        Stages et dates
      </h2>
      <p className="mb-5 text-xs text-muted-foreground">
        Chaque stage a son intitulé, son niveau et son tarif, et peut réunir
        plusieurs dates (avec places et inscrits propres à chacune).
      </p>

      <div className="flex flex-col gap-4">
        {stages.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-sm border border-border">
            <form
              action={updateStage.bind(null, transmetteurId, s.id)}
              className="p-4"
            >
              <StageFields stage={s} />
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="submit"
                  className="rounded-sm border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-accent"
                >
                  Enregistrer
                </button>
                <button
                  type="submit"
                  formAction={deleteStage.bind(null, transmetteurId, s.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Supprimer ce stage
                </button>
              </div>
            </form>
            <DatesList transmetteurId={transmetteurId} stage={s} />
          </div>
        ))}
      </div>

      <details className="mt-5 rounded-sm border border-dashed border-input p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          + Nouveau stage
        </summary>
        <form action={createStage.bind(null, transmetteurId)} className="mt-4">
          <StageFields />
          <button
            type="submit"
            className="mt-3 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[#8a4222]"
          >
            Créer le stage
          </button>
        </form>
      </details>
    </section>
  );
}
