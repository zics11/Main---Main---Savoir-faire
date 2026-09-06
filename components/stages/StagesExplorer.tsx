"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FranceMap } from "@/components/map/FranceMap";
import {
  dansLeCadrage,
  type MapBounds,
  type TransmetteurPoint,
} from "@/components/map/types";
import { DOMAINE_LABELS, TYPES_TRANSMISSION } from "@/lib/constants";
import type { Domaine } from "@/lib/db/schema";
import { formatDateRange } from "@/lib/format";
import type { UpcomingStage } from "@/lib/queries";

const DOMAINE_OPTIONS: (Domaine | "toutes")[] = [
  "toutes",
  "habitat",
  "artisanat",
  "alimentation",
  "jardin_nature",
];

const JOUR_MS = 24 * 3600 * 1000;

// Distances proposées pour « autour de moi », en km : elles cadrent la carte
// (c'est le cadrage qui décide de la liste), elles ne filtrent pas.
const RAYONS = [20, 100];

// Échéances proposées, en jours ; null = pas de limite.
const HORIZONS: { jours: number; label: string }[] = [
  { jours: 7, label: "7 j" },
  { jours: 30, label: "30 j" },
  { jours: 90, label: "3 mois" },
];

export function StagesExplorer({ stages }: { stages: UpcomingStage[] }) {
  const [domaine, setDomaine] = useState<Domaine | "toutes">("toutes");
  const [recherche, setRecherche] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [hebergement, setHebergement] = useState(false);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [actif, setActif] = useState<string | null>(null);
  // frozen at mount — precise-to-the-second freshness isn't needed for a
  // "within 30 days" filter, and reading Date.now() during render is impure
  const [now] = useState(() => Date.now());
  // Comme sur la carte des transmetteurs : la carte garde tous les points
  // filtrés, seule la liste se restreint à ce qui est affiché à l'écran.
  const [cadrage, setCadrage] = useState<MapBounds | null>(null);
  // « Autour de moi » ne filtre pas non plus : il recadre la carte, et c'est
  // le cadrage qui décide de la liste.
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [rayonKm, setRayonKm] = useState(100);
  const [geoErreur, setGeoErreur] = useState<string | null>(null);
  const [panneau, setPanneau] = useState(false);

  // Ce qui est masqué derrière le bouton « Filtres » — compté pour le signaler
  // quand la fenêtre est refermée.
  const nbFiltres =
    (domaine !== "toutes" ? 1 : 0) + types.length + (hebergement ? 1 : 0);

  useEffect(() => {
    if (!panneau) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPanneau(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panneau]);

  const onUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoErreur("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoErreur(null);
      },
      () => setGeoErreur("Localisation refusée ou indisponible.")
    );
  };

  function choisirRayon(r: number) {
    // Re-cliquer sur la distance active oublie la position et rend la carte
    // à sa vue précédente.
    if (position !== null && rayonKm === r) {
      setPosition(null);
      return;
    }
    setRayonKm(r);
    if (position === null) onUseLocation();
  }

  const q = recherche.trim().toLowerCase();

  const filtres = useMemo(() => {
    return stages
      .filter((s) => domaine === "toutes" || s.transmetteur.domaine === domaine)
      .filter(
        (s) =>
          q === "" ||
          s.titre.toLowerCase().includes(q) ||
          s.transmetteur.nom.toLowerCase().includes(q) ||
          s.transmetteur.savoirFaire.toLowerCase().includes(q)
      )
      .filter((s) => types.length === 0 || (s.type !== null && types.includes(s.type)))
      .filter((s) => !hebergement || s.transmetteur.hebergement)
      .filter(
        (s) => horizon === null || s.dateDebut.getTime() - now <= horizon * JOUR_MS
      );
  }, [stages, domaine, q, types, hebergement, horizon, now]);

  const visibles = useMemo(
    () =>
      cadrage
        ? filtres.filter((s) => dansLeCadrage(s.transmetteur, cadrage))
        : filtres,
    [filtres, cadrage]
  );
  const horsCadre = filtres.length - visibles.length;

  const points: TransmetteurPoint[] = filtres.map((s) => ({
    ...s.transmetteur,
    id: s.id,
  }));

  const focus = useMemo(
    () => (position ? { ...position, rayonKm } : null),
    [position, rayonKm]
  );

  const resetFiltres = () => {
    setDomaine("toutes");
    setRecherche("");
    setTypes([]);
    setHebergement(false);
    setHorizon(null);
    setPosition(null);
  };

  return (
    // min-h-0 à chaque niveau : sans ça un enfant flex/grid grandit avec son
    // contenu au lieu de se limiter à l'écran, et la liste ne défile jamais.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-background px-6 pt-5 pb-3 sm:px-12">
        <h1 className="font-serif text-3xl font-semibold leading-tight">
          Des dates pour apprendre en faisant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cliquez sur un point de la carte pour un aperçu, puis sur
          l&apos;aperçu pour ouvrir la fiche.
        </p>
      </div>

      {/* Bandeau : on ne garde en permanence que la recherche, l'échéance et
          la proximité. Domaine, formes et hébergement passent derrière un
          bouton « Filtres », avec un compteur pour ne pas oublier qu'ils
          sont actifs une fois la fenêtre refermée. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background px-6 py-3 sm:px-12">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Rechercher
        </span>
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Un stage, un nom, un savoir-faire…"
          className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm sm:w-72"
        />

        <span className="hidden h-6 w-px bg-border sm:block" />

        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Quand
        </span>
        <div className="flex flex-wrap gap-1.5">
          {HORIZONS.map((h) => {
            const on = horizon === h.jours;
            return (
              <button
                key={h.jours}
                type="button"
                // Un second clic sur l'échéance active la retire : c'est le
                // seul moyen de revenir à « toutes les dates ».
                onClick={() => setHorizon(on ? null : h.jours)}
                className={`rounded-sm border px-3 py-2 text-sm font-medium ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                {h.label}
              </button>
            );
          })}
        </div>

        <span className="hidden h-6 w-px bg-border sm:block" />

        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Autour de moi
        </span>
        <div className="flex flex-wrap gap-1.5">
          {RAYONS.map((r) => {
            const on = position !== null && rayonKm === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => choisirRayon(r)}
                className={`rounded-sm border px-3 py-2 text-sm font-medium ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                {r} km
              </button>
            );
          })}
        </div>
        {geoErreur && <span className="text-xs text-destructive">{geoErreur}</span>}

        {/* Volontairement plus marqué que les pastilles voisines : c'est le
            seul bouton du bandeau qui ouvre une fenêtre. */}
        <button
          type="button"
          onClick={() => setPanneau(true)}
          className={`ml-auto flex items-center gap-2 rounded-sm border px-4 py-2 text-sm font-semibold whitespace-nowrap ${
            nbFiltres > 0
              ? "border-primary bg-primary text-primary-foreground hover:bg-[#8a4222]"
              : "border-primary bg-card text-primary hover:bg-accent"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 5h16l-6.5 7.6V19l-3 1.5v-8.9L4 5z" />
          </svg>
          Filtres
          {nbFiltres > 0 && (
            <span className="rounded-full bg-primary-foreground/25 px-1.5 text-xs">
              {nbFiltres}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={resetFiltres}
          className="text-sm whitespace-nowrap text-primary"
        >
          Tout effacer
        </button>
      </div>

      {panneau && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 sm:p-8"
          onClick={() => setPanneau(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtres"
            className="relative w-full max-w-lg rounded-sm border border-border bg-background p-6 shadow-lg sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPanneau(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg hover:bg-accent"
            >
              ×
            </button>

            <h2 className="mb-6 font-serif text-2xl font-semibold">Filtres</h2>

            <div className="mb-2.5 text-xs tracking-wide text-muted-foreground uppercase">
              Domaine
            </div>
            <div className="mb-6 flex flex-col gap-0.5">
              {DOMAINE_OPTIONS.map((d) => {
                const count =
                  d === "toutes"
                    ? stages.length
                    : stages.filter((s) => s.transmetteur.domaine === d).length;
                const label = d === "toutes" ? "Tous les domaines" : DOMAINE_LABELS[d];
                const on = domaine === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomaine(d)}
                    className={`flex items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm font-medium ${
                      on ? "bg-accent text-primary" : "text-foreground/80 hover:bg-accent/50"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-2.5 text-xs tracking-wide text-muted-foreground uppercase">
              Formes proposées
            </div>
            <div className="mb-6 flex flex-wrap gap-1.5">
              {TYPES_TRANSMISSION.map((nom) => {
                const on = types.includes(nom);
                return (
                  <button
                    key={nom}
                    type="button"
                    onClick={() =>
                      setTypes((prev) =>
                        on ? prev.filter((t) => t !== nom) : [...prev, nom]
                      )
                    }
                    className={`rounded-sm border px-2.5 py-1.5 text-xs font-medium ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-card text-foreground/80 hover:bg-accent"
                    }`}
                  >
                    {nom}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hebergement}
                onChange={(e) => setHebergement(e.target.checked)}
                className="accent-primary"
              />
              Hébergement sur place
            </label>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5">
              <button
                type="button"
                onClick={resetFiltres}
                className="text-sm text-primary"
              >
                Tout effacer
              </button>
              <button
                type="button"
                onClick={() => setPanneau(false)}
                className="rounded-sm bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
              >
                Voir les {visibles.length} {visibles.length > 1 ? "dates" : "date"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* min-h-0 : sans ça la grille grandit avec son contenu et la colonne
          de gauche ne défile jamais — les dernières dates deviennent
          inatteignables. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Liste, défilante */}
        <div className="min-h-0 overflow-y-auto border-r border-border">
          <div className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-3 sm:px-8">
            <div className="font-serif text-2xl font-semibold">
              {visibles.length} {visibles.length > 1 ? "dates" : "date"}
              <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                dans la zone affichée
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              Date la plus proche d&apos;abord
            </span>
          </div>

          {horsCadre > 0 && (
            <p className="px-6 pb-3 text-xs text-muted-foreground sm:px-8">
              {horsCadre} autre{horsCadre > 1 ? "s" : ""} hors du cadre —
              dézoomez ou déplacez la carte.
            </p>
          )}

          <div className="flex flex-col gap-3 px-6 pb-10 sm:px-8">
            {visibles.map((s) => {
              const restantes = s.places !== null ? s.places - s.inscrits : null;
              const complet = restantes === 0;
              return (
                <Link
                  key={s.id}
                  href={`/fiche/${s.transmetteur.slug}#stage-${s.stageId}`}
                  onMouseEnter={() => setActif(s.id)}
                  onMouseLeave={() => setActif(null)}
                  className={`flex h-36 overflow-hidden rounded-sm border bg-card ${
                    actif === s.id ? "border-primary" : "border-border"
                  }`}
                >
                  {/* Emplacement toujours présent, même sans photo, pour que
                      toutes les cartes gardent le même gabarit. */}
                  <div className="relative w-36 shrink-0 self-stretch bg-secondary">
                    {s.photo && (
                      <Image
                        src={s.photo}
                        alt={s.titre}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-foreground">
                        {formatDateRange(s.dateDebut, s.dateFin)}
                      </span>
                      {restantes !== null && (
                        <span
                          className={`shrink-0 font-semibold whitespace-nowrap ${complet ? "text-muted-foreground" : "text-[#4a6741]"}`}
                        >
                          {complet ? "Complet" : `${restantes} / ${s.places}`}
                        </span>
                      )}
                    </div>

                    <div className="line-clamp-1 font-serif text-lg font-semibold leading-tight">
                      {s.titre}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {s.type && (
                        <span className="truncate rounded-sm bg-accent px-2 py-0.5 text-[10.5px] tracking-wide whitespace-nowrap text-primary uppercase">
                          {s.type}
                        </span>
                      )}
                      {s.prix && (
                        <span className="shrink-0 text-[13px] font-semibold whitespace-nowrap text-primary">
                          {s.prix}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto truncate text-xs text-muted-foreground">
                      {s.transmetteur.nom} · {s.transmetteur.lieuApproximatif}
                    </div>
                  </div>
                </Link>
              );
            })}

            {visibles.length === 0 && (
              <div className="rounded-sm border border-border bg-card p-10 text-center">
                <div className="mb-2 font-serif text-lg font-semibold">
                  {filtres.length > 0
                    ? "Aucune date dans cette zone"
                    : "Rien dans cette sélection"}
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filtres.length > 0
                    ? `Déplacez ou dézoomez la carte : ${filtres.length} date${filtres.length > 1 ? "s correspondent" : " correspond"} à vos filtres ailleurs en France.`
                    : "Beaucoup de transmetteurs accueillent aussi hors dates annoncées."}
                </div>
                {filtres.length === 0 && (
                  <button
                    type="button"
                    onClick={resetFiltres}
                    className="rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carte */}
        <div className="min-h-[420px] bg-secondary">
          <FranceMap
            points={points}
            activeId={actif}
            onHover={setActif}
            onBoundsChange={setCadrage}
            focus={focus}
          />
        </div>
      </div>
    </div>
  );
}
