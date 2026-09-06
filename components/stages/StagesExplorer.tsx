"use client";

import { useMemo, useState } from "react";
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

const TRENTE_JOURS_MS = 30 * 24 * 3600 * 1000;

export function StagesExplorer({ stages }: { stages: UpcomingStage[] }) {
  const [domaine, setDomaine] = useState<Domaine | "toutes">("toutes");
  const [types, setTypes] = useState<string[]>([]);
  const [hebergement, setHebergement] = useState(false);
  const [trenteJours, setTrenteJours] = useState(false);
  const [actif, setActif] = useState<string | null>(null);
  // frozen at mount — precise-to-the-second freshness isn't needed for a
  // "within 30 days" filter, and reading Date.now() during render is impure
  const [now] = useState(() => Date.now());
  // Comme sur la carte des transmetteurs : la carte garde tous les points
  // filtrés, seule la liste se restreint à ce qui est affiché à l'écran.
  const [cadrage, setCadrage] = useState<MapBounds | null>(null);

  const filtres = useMemo(() => {
    return stages
      .filter((s) => domaine === "toutes" || s.transmetteur.domaine === domaine)
      .filter((s) => types.length === 0 || (s.type !== null && types.includes(s.type)))
      .filter((s) => !hebergement || s.transmetteur.hebergement)
      .filter((s) => !trenteJours || s.dateDebut.getTime() - now <= TRENTE_JOURS_MS);
  }, [stages, domaine, types, hebergement, trenteJours, now]);

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

  const resetFiltres = () => {
    setDomaine("toutes");
    setTypes([]);
    setHebergement(false);
    setTrenteJours(false);
  };

  return (
    // min-h-0 à chaque niveau : sans ça un enfant flex/grid grandit avec son
    // contenu au lieu de se limiter à l'écran, et la liste ne défile jamais.
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Filtres, en bandeau */}
      <div className="flex flex-wrap items-center gap-3.5 border-b border-border bg-card px-6 py-3 sm:px-12">
        <div className="flex flex-wrap gap-1.5">
          {DOMAINE_OPTIONS.map((d) => {
            const label = d === "toutes" ? "Tous" : DOMAINE_LABELS[d];
            const on = domaine === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDomaine(d)}
                className={`rounded-sm border px-3 py-2 text-xs font-medium ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="h-6 w-px bg-border" />
        <div className="flex flex-wrap gap-1.5">
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
        <span className="h-6 w-px bg-border" />
        <label className="flex items-center gap-2 text-[13.5px] whitespace-nowrap">
          <input
            type="checkbox"
            checked={hebergement}
            onChange={(e) => setHebergement(e.target.checked)}
            className="accent-primary"
          />
          Hébergement
        </label>
        <label className="flex items-center gap-2 text-[13.5px] whitespace-nowrap">
          <input
            type="checkbox"
            checked={trenteJours}
            onChange={(e) => setTrenteJours(e.target.checked)}
            className="accent-primary"
          />
          Sous 30 jours
        </label>
        <button
          type="button"
          onClick={resetFiltres}
          className="ml-auto text-xs whitespace-nowrap text-primary"
        >
          Tout effacer
        </button>
      </div>

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
                  href={`/fiche/${s.transmetteur.slug}`}
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
          />
        </div>
      </div>
    </div>
  );
}
