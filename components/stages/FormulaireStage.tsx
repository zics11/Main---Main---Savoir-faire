"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useModificationsEnCours } from "@/components/shared/ModificationsEnCours";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import { ModaleConfirmation } from "@/components/ui/ModaleConfirmation";
import { NIVEAUX_STAGE, TYPES_TRANSMISSION } from "@/lib/constants";
import {
  DUREE_MAX,
  ecrireDuree,
  finDuStage,
  lireDuree,
  UNITES_DUREE,
  type UniteDuree,
} from "@/lib/duree";
import type { Stage, StageDate } from "@/lib/db/schema";
import type { DateSaisie, EtatStage, MomentSaisi } from "@/lib/stage";
import {
  depuisChemins,
  GaleriePhotos,
  referencePhoto,
  type PhotoGalerie,
} from "@/components/shared/GaleriePhotos";
import { bouton, cadreChamp, champ } from "@/lib/style";

export type StageAvecDates = Stage & { dates: StageDate[] };

export type ActionStage = (
  precedent: EtatStage,
  formData: FormData,
) => Promise<EtatStage>;

// Les lignes ajoutées dans le formulaire n'ont pas encore d'identifiant en
// base : `cle` leur en donne un le temps de l'édition, pour React seulement.
type LigneDate = {
  cle: string;
  id: string | null;
  dateDebut: string;
  places: string;
  inscrits: string;
  publiee: boolean;
};
type LigneMoment = { cle: string; heure: string; titre: string };

type Brouillon = {
  titre: string;
  type: string;
  niveau: string;
  dureeNombre: string;
  dureeUnite: UniteDuree;
  prix: string;
  description: string;
  note: string;
  dates: LigneDate[];
  programme: LigneMoment[];
  /** Dans l'ordre : la première est la photo d'accueil. */
  photos: PhotoGalerie[];
};

let compteur = 0;
const nouvelleCle = () => `nouveau-${++compteur}`;

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

function dateVide(): LigneDate {
  return {
    cle: nouvelleCle(),
    id: null,
    dateDebut: "",
    places: "",
    inscrits: "0",
    publiee: true,
  };
}

function momentVide(): LigneMoment {
  return { cle: nouvelleCle(), heure: "", titre: "" };
}

function depuisStage(stage: StageAvecDates | null): Brouillon {
  if (!stage) {
    // Un stage neuf s'ouvre avec une date et un moment à remplir : on voit
    // tout de suite où écrire.
    return {
      titre: "",
      type: "",
      niveau: "",
      dureeNombre: "1",
      dureeUnite: "jour",
      prix: "",
      description: "",
      note: "",
      dates: [dateVide()],
      programme: [momentVide()],
      photos: [],
    };
  }
  // Une durée d'avant, saisie en texte libre, se relit au mieux ; à défaut,
  // une journée — à corriger avant d'enregistrer.
  const duree = lireDuree(stage.duree) ?? { nombre: 1, unite: "jour" };
  return {
    titre: stage.titre,
    type: stage.type ?? "",
    niveau: stage.niveau ?? "",
    dureeNombre: String(duree.nombre),
    dureeUnite: duree.unite,
    prix: stage.prix ?? "",
    description: stage.description,
    note: stage.note ?? "",
    dates: [...stage.dates]
      .sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime())
      .map((d) => ({
        cle: d.id,
        id: d.id,
        dateDebut: jourIso(d.dateDebut),
        places: d.places === null ? "" : String(d.places),
        inscrits: String(d.inscrits),
        publiee: d.publiee,
      })),
    photos: depuisChemins(stage.photos),
    programme: stage.programme.map((m, i) => ({
      cle: `moment-${i}`,
      heure: m.heure,
      titre: m.titre,
    })),
  };
}

/** Une date laissée entièrement vide n'est pas envoyée : ce n'est pas une date. */
function dateSaisie(d: LigneDate) {
  return (
    d.dateDebut !== "" || d.places !== "" || !["", "0"].includes(d.inscrits)
  );
}

function versDates(lignes: LigneDate[]): DateSaisie[] {
  return lignes.filter(dateSaisie).map((d) => ({
    id: d.id,
    dateDebut: d.dateDebut,
    places: d.places === "" ? null : Number(d.places),
    inscrits: d.inscrits === "" ? 0 : Number(d.inscrits),
    publiee: d.publiee,
  }));
}

function versProgramme(lignes: LigneMoment[]): MomentSaisi[] {
  return lignes
    .map((m) => ({ heure: m.heure.trim(), titre: m.titre.trim() }))
    .filter((m) => m.titre !== "" || m.heure !== "");
}

/** Ce qui compte pour savoir si quelque chose a changé — sans les clés d'édition. */
function empreinte(b: Brouillon) {
  return JSON.stringify({
    ...b,
    dates: versDates(b.dates),
    programme: versProgramme(b.programme),
    photos: b.photos.map(referencePhoto),
  });
}

const etiquette = "flex flex-col gap-1.5 text-sm";
const libelle = "text-muted-foreground";

/**
 * L'édition d'un stage, dates comprises, enregistrée d'un seul geste depuis
 * la barre du bas. Tant que rien n'est enregistré, la barre le rappelle.
 */
export function FormulaireStage({
  stage,
  enregistrer,
  supprimer,
  justeEnregistre,
  erreur,
  onResultat,
  onModifie,
  onFermer,
  onSupprime,
}: {
  /** null : un stage à créer. */
  stage: StageAvecDates | null;
  enregistrer: ActionStage;
  supprimer: (stageId: string) => Promise<void>;
  /** Vient d'être enregistré : la barre le confirme jusqu'à la prochaine modification. */
  justeEnregistre: boolean;
  erreur: string | null;
  onResultat: (resultat: EtatStage) => void;
  onModifie: (modifie: boolean) => void;
  onFermer: () => void;
  onSupprime: () => void;
}) {
  const initial = useMemo(() => depuisStage(stage), [stage]);
  const [brouillon, setBrouillon] = useState(initial);
  const [confirmer, setConfirmer] = useState<"fermer" | "supprimer" | null>(
    null,
  );
  const [enCours, demarrer] = useTransition();
  const titreRef = useRef<HTMLInputElement>(null);
  const [voirArchives, setVoirArchives] = useState(false);
  // Figé à l'ouverture : la frontière « passée / archivée » ne bouge pas
  // pendant qu'on modifie.
  const [maintenant] = useState(() => Date.now());

  const modifie = empreinte(brouillon) !== empreinte(initial);
  const nouveau = stage === null;

  useModificationsEnCours("stages", modifie);
  useEffect(() => {
    onModifie(modifie);
  }, [modifie, onModifie]);
  useEffect(() => () => onModifie(false), [onModifie]);

  // Un stage neuf : on commence par son intitulé.
  useEffect(() => {
    if (nouveau) titreRef.current?.focus();
  }, [nouveau]);

  const changer = <K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) =>
    setBrouillon((b) => ({ ...b, [cle]: valeur }));

  const changerDate = (cle: string, modif: Partial<LigneDate>) =>
    setBrouillon((b) => ({
      ...b,
      dates: b.dates.map((d) => (d.cle === cle ? { ...d, ...modif } : d)),
    }));

  const changerMoment = (cle: string, modif: Partial<LigneMoment>) =>
    setBrouillon((b) => ({
      ...b,
      programme: b.programme.map((m) =>
        m.cle === cle ? { ...m, ...modif } : m,
      ),
    }));

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    demarrer(async () => {
      try {
        onResultat(await enregistrer(null, donnees));
      } catch {
        onResultat({
          ok: false,
          erreur:
            "L'enregistrement n'a pas abouti. Vérifiez la connexion et réessayez.",
        });
      }
    });
  }

  function confirmerSuppression() {
    if (!stage) return;
    demarrer(async () => {
      await supprimer(stage.id);
      onSupprime();
    });
  }

  // La fin de chaque date découle de la durée saisie plus haut. Une date
  // passée est archivée : rangée à part, toujours enregistrée, mais elle
  // n'encombre plus la liste.
  const dureeTexte = ecrireDuree({
    nombre: Math.max(1, Number(brouillon.dureeNombre) || 1),
    unite: brouillon.dureeUnite,
  });
  const aujourdhui = jourIso(new Date(maintenant));
  const finDe = (d: LigneDate) =>
    d.dateDebut ? jourIso(finDuStage(new Date(d.dateDebut), dureeTexte)) : "";
  const archivees = brouillon.dates.filter(
    (d) => d.dateDebut !== "" && finDe(d) < aujourdhui,
  );
  const courantes = brouillon.dates.filter((d) => !archivees.includes(d));

  const ligneDate = (d: LigneDate) => {
    const archivee = archivees.includes(d);
    return (
      <li
        key={d.cle}
        className={`grid grid-cols-2 items-center gap-3 border-t border-primary/15 py-3 first:border-t-0 sm:grid-cols-[13rem_6rem_6rem_5.5rem_minmax(0,1fr)] sm:first:border-t ${
          archivee ? "opacity-70" : ""
        }`}
      >
        <label className="col-span-2 flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-1">
          <span className="sm:sr-only">Début</span>
          <input
            type="date"
            value={d.dateDebut}
            onChange={(e) => changerDate(d.cle, { dateDebut: e.target.value })}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="sm:sr-only">Places</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={d.places}
            placeholder="—"
            title="Laisser vide si le nombre de places n'est pas limité"
            onChange={(e) => changerDate(d.cle, { places: e.target.value })}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="sm:sr-only">Inscrits</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={d.inscrits}
            onChange={(e) => changerDate(d.cle, { inscrits: e.target.value })}
            className={champ}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={d.publiee}
            onChange={(e) => changerDate(d.cle, { publiee: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          <span className="sm:sr-only">Visible</span>
        </label>
        <button
          type="button"
          onClick={() =>
            changer(
              "dates",
              brouillon.dates.filter((x) => x.cle !== d.cle),
            )
          }
          aria-label="Retirer cette date"
          title="Retirer cette date"
          className="flex h-10 w-10 items-center justify-center justify-self-end rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
        >
          <Trash2Icon aria-hidden className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <form
      onSubmit={envoyer}
      className="overflow-hidden rounded-sm border-2 border-primary/50 bg-card shadow-sm"
    >
      <input type="hidden" name="stageId" value={stage?.id ?? ""} />
      <input
        type="hidden"
        name="dates"
        value={JSON.stringify(versDates(brouillon.dates))}
      />
      <input
        type="hidden"
        name="programme"
        value={JSON.stringify(versProgramme(brouillon.programme))}
      />

      <div className="flex items-center justify-between gap-4 border-b border-border bg-secondary px-6 py-4">
        <h3 className="font-serif text-xl font-semibold">
          {nouveau ? "Nouveau stage" : "Modifier le stage"}
        </h3>
        <button
          type="button"
          onClick={() => (modifie ? setConfirmer("fermer") : onFermer())}
          aria-label="Fermer ce stage"
          className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-card hover:text-foreground"
        >
          <XIcon aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <Section titre="L'essentiel">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${etiquette} sm:col-span-2`}>
            <span className={libelle}>Intitulé du stage</span>
            <input
              ref={titreRef}
              name="titre"
              value={brouillon.titre}
              onChange={(e) => changer("titre", e.target.value)}
              placeholder="ex : Forger son couteau de poche"
              className="w-full rounded-sm border border-input bg-card px-3 py-2.5 font-serif text-lg"
            />
          </label>
          <label className={etiquette}>
            <span className={libelle}>Forme</span>
            <select
              name="type"
              value={brouillon.type}
              onChange={(e) => changer("type", e.target.value)}
              className={champ}
            >
              <option value="">— à préciser</option>
              {TYPES_TRANSMISSION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className={etiquette}>
            <span className={libelle}>Niveau</span>
            <select
              name="niveau"
              value={brouillon.niveau}
              onChange={(e) => changer("niveau", e.target.value)}
              className={champ}
            >
              <option value="">— à préciser</option>
              {NIVEAUX_STAGE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className={etiquette}>
            <span id="libelle-duree" className={libelle}>
              Durée
            </span>
            {/* Un nombre et une unité : la durée donne la fin de chaque date,
                qu'on n'a donc pas à saisir. */}
            <div
              className="flex gap-2"
              role="group"
              aria-labelledby="libelle-duree"
            >
              <input
                type="number"
                name="dureeNombre"
                min={1}
                max={DUREE_MAX[brouillon.dureeUnite]}
                inputMode="numeric"
                value={brouillon.dureeNombre}
                onChange={(e) => changer("dureeNombre", e.target.value)}
                aria-label="Nombre"
                className={`${cadreChamp} w-20 shrink-0`}
              />
              <select
                name="dureeUnite"
                value={brouillon.dureeUnite}
                onChange={(e) =>
                  changer("dureeUnite", e.target.value as UniteDuree)
                }
                aria-label="Unité"
                className={champ}
              >
                {UNITES_DUREE.map((u) => (
                  <option key={u} value={u}>
                    {Number(brouillon.dureeNombre) > 1 ? `${u}s` : u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className={etiquette}>
            <span className={libelle}>Prix ou contrepartie</span>
            <input
              name="prix"
              value={brouillon.prix}
              onChange={(e) => changer("prix", e.target.value)}
              placeholder="ex : 180 € / pers., Échange, Gratuit"
              className={champ}
            />
          </label>
          <label className={`${etiquette} sm:col-span-2`}>
            <span className={libelle}>Description</span>
            <textarea
              name="description"
              value={brouillon.description}
              onChange={(e) => changer("description", e.target.value)}
              rows={4}
              placeholder="Ce qu'on y apprend, ce qu'on repart avec, à qui il s'adresse…"
              className={champ}
            />
          </label>
        </div>
      </Section>

      <Section
        titre="Le programme d'une journée"
        aide="Facultatif. Un moment par ligne, dans l'ordre de la journée."
      >
        <ul className="flex flex-col gap-2">
          {brouillon.programme.map((m) => (
            <li key={m.cle} className="flex items-center gap-2">
              <input
                value={m.heure}
                onChange={(e) =>
                  changerMoment(m.cle, { heure: e.target.value })
                }
                placeholder="9 h"
                aria-label="Heure"
                className={`${cadreChamp} w-20 shrink-0 sm:w-24`}
              />
              <input
                value={m.titre}
                onChange={(e) =>
                  changerMoment(m.cle, { titre: e.target.value })
                }
                placeholder="ex : Pétrissage à la main"
                aria-label="Ce qu'on fait"
                className={`${champ} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() =>
                  changer(
                    "programme",
                    brouillon.programme.filter((x) => x.cle !== m.cle),
                  )
                }
                aria-label="Retirer ce moment"
                title="Retirer ce moment"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <XIcon aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <BoutonAjout
          onClick={() =>
            changer("programme", [...brouillon.programme, momentVide()])
          }
        >
          Ajouter un moment
        </BoutonAjout>
      </Section>

      <Section
        titre="Infos pratiques"
        aide="Facultatif. Affichées sous les dates : hébergement, repas, matériel à prévoir…"
      >
        <input
          name="note"
          value={brouillon.note}
          onChange={(e) => changer("note", e.target.value)}
          placeholder="ex : Repas tiré du sac, chaussures fermées obligatoires."
          className={champ}
        />
      </Section>

      <Section
        titre="Photos"
        aide="La photo d'accueil ouvre le stage sur la fiche : choisissez-la d'un clic sur l'étoile."
      >
        <GaleriePhotos
          photos={brouillon.photos}
          onChange={(photos) => changer("photos", photos)}
        />
      </Section>

      {/* Les dates ferment l'édition, mises en avant comme sur la fiche
          publique : c'est ce qui fait réserver. */}
      <Section
        enAvant
        titre="Les dates"
        aide="Le jour où le stage commence : sa fin découle de la durée. Décochez « Visible » pour retirer une date de la fiche sans la supprimer."
      >
        {courantes.length > 0 && (
          <div className="hidden grid-cols-[13rem_6rem_6rem_5.5rem_minmax(0,1fr)] gap-3 pb-2 text-xs text-muted-foreground sm:grid">
            <span>Début</span>
            <span>Places</span>
            <span>Inscrits</span>
            <span>Visible</span>
            <span />
          </div>
        )}
        <ul className="flex flex-col">{courantes.map(ligneDate)}</ul>
        {brouillon.dates.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune date : le stage n&apos;apparaîtra pas sur la fiche tant
            qu&apos;il n&apos;en a pas.
          </p>
        )}
        <BoutonAjout
          onClick={() => changer("dates", [...brouillon.dates, dateVide()])}
        >
          Ajouter une date
        </BoutonAjout>

        {archivees.length > 0 && (
          <div className="mt-5 border-t border-primary/15 pt-4">
            <button
              type="button"
              onClick={() => setVoirArchives((v) => !v)}
              aria-expanded={voirArchives}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArchiveIcon aria-hidden className="h-4 w-4" />
              Dates archivées ({archivees.length})
              <ChevronDownIcon
                aria-hidden
                className={`h-4 w-4 transition-transform ${voirArchives ? "rotate-180" : ""}`}
              />
            </button>
            {voirArchives && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  Les dates passées : elles restent enregistrées, mais
                  n&apos;encombrent plus la liste.
                </p>
                <ul className="mt-2 flex flex-col">
                  {archivees.map(ligneDate)}
                </ul>
              </>
            )}
          </div>
        )}
      </Section>

      {!nouveau && (
        <div className="border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => setConfirmer("supprimer")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon aria-hidden className="h-4 w-4" />
            Supprimer ce stage
          </button>
        </div>
      )}

      {/* La barre du bas, la même que dans l'onglet Fiche : elle enregistre
          le stage ouvert. */}
      <BarreEnregistrement
        modifie={modifie}
        enCours={enCours}
        erreur={erreur}
        info={
          justeEnregistre
            ? `Stage « ${brouillon.titre.trim()} » enregistré.`
            : null
        }
        enregistrer={{ libelle: nouveau ? "Créer le stage" : "Enregistrer" }}
      />

      {confirmer === "fermer" && (
        <ModaleConfirmation
          titre="Abandonner les modifications ?"
          onClose={() => setConfirmer(null)}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            Ce que vous avez changé dans «{" "}
            {brouillon.titre.trim() || "ce stage"} » n&apos;est pas enregistré
            et sera perdu.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmer(null)}
              className={bouton.secondaire}
            >
              Continuer la modification
            </button>
            <button
              type="button"
              onClick={onFermer}
              className={bouton.danger}
            >
              Abandonner
            </button>
          </div>
        </ModaleConfirmation>
      )}

      {confirmer === "supprimer" && stage && (
        <ModaleConfirmation
          titre="Supprimer ce stage ?"
          onClose={() => setConfirmer(null)}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            « {stage.titre} », ses {stage.dates.length} date
            {stage.dates.length > 1 ? "s" : ""} et ses photos seront
            définitivement supprimés.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmer(null)}
              className={bouton.secondaire}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmerSuppression}
              disabled={enCours}
              className={bouton.danger}
            >
              {enCours ? "Suppression…" : "Supprimer le stage"}
            </button>
          </div>
        </ModaleConfirmation>
      )}
    </form>
  );
}

function Section({
  titre,
  aide,
  enAvant = false,
  children,
}: {
  titre: string;
  aide?: string;
  /** Le bloc des dates : fond teinté et intitulé en couleur. */
  enAvant?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`px-6 py-5 first-of-type:border-t-0 ${
        enAvant
          ? "border-t-2 border-primary/30 bg-accent/50 py-6"
          : "border-t border-border"
      }`}
    >
      <h4
        className={`flex items-center gap-2 font-serif font-semibold ${
          enAvant ? "text-xl text-primary" : "text-lg"
        }`}
      >
        {enAvant && <CalendarDaysIcon aria-hidden className="h-5 w-5" />}
        {titre}
      </h4>
      {aide && (
        <p
          className={`mt-0.5 text-sm ${enAvant ? "text-foreground/70" : "text-muted-foreground"}`}
        >
          {aide}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BoutonAjout({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 rounded-sm border border-dashed border-primary/50 px-3.5 py-2 text-sm font-medium text-primary hover:bg-accent"
    >
      <PlusIcon aria-hidden className="h-4 w-4" />
      {children}
    </button>
  );
}
