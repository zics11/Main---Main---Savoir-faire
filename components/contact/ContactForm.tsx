"use client";

import { useActionState, useState } from "react";
import type { Stage, StageDate } from "@/lib/db/schema";
import type { ContactState } from "@/app/fiche/[slug]/contact-actions";
import { formatDateRange } from "@/lib/format";

// Le niveau de l'apprenant (qui écrit) — distinct du niveau du stage choisi.
const NIVEAUX_APPRENANT = [
  "Grand débutant",
  "J'ai déjà essayé chez moi",
  "Je pratique régulièrement",
  "Professionnel en reconversion",
];

type Offre = Stage & { dates: StageDate[] };

const inputClass =
  "w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm";
const labelClass = "flex flex-col gap-1.5 text-sm";

export function ContactForm({
  fiche,
  offres,
  initialStageId,
  initialDateId,
  action,
  onClose,
}: {
  fiche: {
    slug: string;
    titre: string;
    nom: string;
    prenom: string;
    lieuApproximatif: string;
  };
  offres: Offre[];
  initialStageId?: string;
  initialDateId?: string;
  action: (prevState: ContactState, formData: FormData) => Promise<ContactState>;
  onClose?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    action,
    {}
  );

  // Pas de présélection par défaut : seul un bouton "Demander" (lié à une date
  // précise) préremplit une offre. Sinon, la personne choisit elle-même —
  // y compris « Une question, ou autre chose ».
  const initialStage = offres.find((o) => o.id === initialStageId) ?? null;
  const [stageId, setStageId] = useState<string | null>(initialStage?.id ?? null);
  const stage = offres.find((o) => o.id === stageId) ?? null;

  const [dateId, setDateId] = useState<string | null>(
    stage?.dates.some((d) => d.id === initialDateId)
      ? (initialDateId ?? null)
      : (stage?.dates[0]?.id ?? null)
  );
  const [souple, setSouple] = useState(false);
  const [personnes, setPersonnes] = useState(1);

  const date = stage?.dates.find((d) => d.id === dateId) ?? null;
  const restantes = date && date.places !== null ? date.places - date.inscrits : null;

  const resumeOffre = stage?.titre ?? "Question, à discuter";
  const resumeDate =
    souple || !date ? "Souple, à convenir" : formatDateRange(date.dateDebut, date.dateFin);

  function choisirStage(o: Offre) {
    setStageId(o.id);
    setDateId(o.dates[0]?.id ?? null);
  }

  if (state.ok) {
    return (
      <div className="p-8 text-center sm:p-12">
        <h2 className="mb-3 font-serif text-2xl font-semibold">
          Message envoyé à {fiche.prenom}
        </h2>
        <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
          Vous recevrez sa réponse par courriel. Rien n&apos;est réservé pour
          l&apos;instant : c&apos;est votre échange qui décidera de la suite.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-2 text-xs tracking-wide text-primary uppercase">
        Prendre contact
      </div>
      <h2 className="mb-2.5 font-serif text-3xl font-semibold">
        Écrire à {fiche.prenom}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Main à Main ne prend aucune réservation et n&apos;encaisse rien. Ce
        message part directement à {fiche.prenom} : vous fixez ensemble les
        dates et les conditions.
      </p>

      <div className="mb-7 rounded-sm border border-border bg-accent px-4 py-3 text-[13px] text-primary">
        Aucun paiement sur la plateforme. Si un stage est payant, le règlement
        se fait entre vous, sur place ou comme {fiche.prenom} le propose.
      </div>

      <form action={formAction} className="flex flex-col gap-7">
        <input type="hidden" name="stageId" value={stageId ?? ""} />
        <input type="hidden" name="stageDateId" value={dateId ?? ""} />
        <input type="hidden" name="personnes" value={personnes} />

        {offres.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-serif text-lg text-primary">01</span>
              <h3 className="font-serif text-xl font-semibold">
                Ce qui vous intéresse
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {offres.map((o) => {
                const on = o.id === stageId;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => choisirStage(o)}
                    className={`flex items-start gap-3.5 rounded-sm border bg-card p-4 text-left ${
                      on ? "border-primary" : "border-border hover:border-input"
                    }`}
                  >
                    <span
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                        on ? "border-primary bg-primary ring-2 ring-card" : "border-input"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{o.titre}</span>
                        {o.type && (
                          <span className="rounded-sm bg-accent px-2 py-0.5 text-[11px] tracking-wide text-primary uppercase">
                            {o.type}
                          </span>
                        )}
                      </span>
                      <span className="block text-[13px] leading-relaxed text-muted-foreground">
                        {o.description}
                      </span>
                    </span>
                    {o.prix && (
                      <span className="shrink-0 text-sm font-semibold whitespace-nowrap text-primary">
                        {o.prix}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setStageId(null);
                  setDateId(null);
                }}
                className={`flex items-start gap-3.5 rounded-sm border bg-card p-4 text-left ${
                  stageId === null ? "border-primary" : "border-border hover:border-input"
                }`}
              >
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                    stageId === null
                      ? "border-primary bg-primary ring-2 ring-card"
                      : "border-input"
                  }`}
                />
                <span className="flex-1">
                  <span className="mb-1 block text-sm font-semibold">
                    Une question, ou autre chose
                  </span>
                  <span className="block text-[13px] leading-relaxed text-muted-foreground">
                    Vous n&apos;êtes pas encore fixé·e, ou votre message ne
                    concerne pas un stage précis.
                  </span>
                </span>
              </button>
            </div>
          </section>
        )}

        {stage && stage.dates.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-serif text-lg text-primary">02</span>
              <h3 className="font-serif text-xl font-semibold">
                Quand pourriez-vous venir
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stage.dates.map((d) => {
                const dRestantes = d.places !== null ? d.places - d.inscrits : null;
                const dComplet = dRestantes === 0;
                const on = d.id === dateId && !souple;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={dComplet}
                    onClick={() => {
                      setDateId(d.id);
                      setSouple(false);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left ${
                      dComplet
                        ? "cursor-not-allowed border-border bg-secondary text-muted-foreground"
                        : on
                          ? "border-primary bg-accent"
                          : "border-border bg-card"
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      {formatDateRange(d.dateDebut, d.dateFin)}
                    </span>
                    <span
                      className={`text-xs whitespace-nowrap ${dComplet ? "text-muted-foreground" : "text-[#4a6741]"}`}
                    >
                      {dComplet
                        ? "Complet"
                        : dRestantes !== null
                          ? `${dRestantes} place${dRestantes > 1 ? "s" : ""}`
                          : "Ouvert"}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-foreground/90">
              <input
                type="checkbox"
                name="souple"
                checked={souple}
                onChange={(e) => setSouple(e.target.checked)}
                className="accent-primary"
              />
              Je suis souple sur les dates, proposez-moi autre chose
            </label>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="font-serif text-lg text-primary">
              {offres.length > 0 ? "03" : "01"}
            </span>
            <h3 className="font-serif text-xl font-semibold">Qui vous êtes</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span className="text-muted-foreground">Prénom et nom</span>
              <input name="nom" required placeholder="Camille Berthier" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className="text-muted-foreground">Courriel</span>
              <input
                type="email"
                name="email"
                required
                placeholder="camille@exemple.fr"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              <span className="text-muted-foreground">Téléphone (optionnel)</span>
              <input
                type="tel"
                name="telephone"
                placeholder="06 12 34 56 78"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              <span className="text-muted-foreground">D&apos;où venez-vous</span>
              <input name="provenance" placeholder="Lyon (69)" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className="text-muted-foreground">Votre niveau</span>
              <select name="niveau" defaultValue={NIVEAUX_APPRENANT[0]} className={inputClass}>
                {NIVEAUX_APPRENANT.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className={labelClass}>
              <span className="text-muted-foreground">Nombre de personnes</span>
              <div className="flex items-center gap-2.5 rounded-sm border border-input bg-card px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => setPersonnes((n) => Math.max(1, n - 1))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-input bg-background text-base hover:bg-accent"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold">
                  {personnes === 1 ? "Je viens seul·e" : `${personnes} personnes`}
                </span>
                <button
                  type="button"
                  onClick={() => setPersonnes((n) => Math.min(8, n + 1))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-input bg-background text-base hover:bg-accent"
                >
                  +
                </button>
              </div>
              {restantes !== null && !souple && personnes > restantes && (
                <span className="text-xs text-primary">
                  Il ne reste que {restantes} place{restantes > 1 ? "s" : ""} sur cette
                  date — {fiche.prenom} vous dira si c&apos;est possible.
                </span>
              )}
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/90">
            <input type="checkbox" name="hebergement" className="accent-primary" />
            J&apos;aurais besoin d&apos;un hébergement sur place
          </label>
        </section>

        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="font-serif text-lg text-primary">
              {offres.length > 0 ? "04" : "02"}
            </span>
            <h3 className="font-serif text-xl font-semibold">Votre message</h3>
          </div>
          <p className="mb-2.5 text-sm text-muted-foreground">
            {stage
              ? "Dites en quelques lignes pourquoi ce savoir-faire vous attire. C'est ce qui donne envie de répondre."
              : "Posez votre question, ou dites en quelques lignes ce qui vous amène."}
          </p>
          <textarea
            name="message"
            required
            rows={5}
            placeholder={`Bonjour ${fiche.prenom}, ...`}
            className={inputClass}
          />
        </section>

        <div className="rounded-sm border border-border bg-secondary p-4">
          <div className="mb-2.5 text-xs tracking-wide text-muted-foreground uppercase">
            Votre demande
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Formule</span>
              <span className="text-right font-medium">{resumeOffre}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Dates</span>
              <span className="text-right font-medium">{resumeDate}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Contrepartie</span>
              <span className="text-right font-semibold text-primary">
                {stage?.prix ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-primary px-7 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
          >
            {pending ? "Envoi…" : `Envoyer à ${fiche.prenom}`}
          </button>
          <span className="text-xs text-muted-foreground">
            {fiche.prenom} répond en général sous quelques jours.
          </span>
        </div>
      </form>
    </div>
  );
}
