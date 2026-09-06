"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DOMAINE_LABELS, TYPES_TRANSMISSION } from "@/lib/constants";
import type { Domaine } from "@/lib/db/schema";
import { dansLeCadrage, type MapBounds, type TransmetteurPoint } from "./types";
import { FranceMap } from "./FranceMap";
import { useTransmetteurFilters } from "./useTransmetteurFilters";

const DOMAINE_OPTIONS: (Domaine | "toutes")[] = [
  "toutes",
  "habitat",
  "artisanat",
  "alimentation",
  "jardin_nature",
];

export function MapExplorer({
  transmetteurs,
  initialDomaine = "toutes",
}: {
  transmetteurs: TransmetteurPoint[];
  initialDomaine?: Domaine | "toutes";
}) {
  const {
    domaine,
    setDomaine,
    recherche,
    setRecherche,
    types,
    setTypes,
    hebergement,
    setHebergement,
    position,
    setPosition,
    rayonKm,
    setRayonKm,
    geoErreur,
    onUseLocation,
    filtres,
    resetFiltres,
    RAYONS_KM,
  } = useTransmetteurFilters(transmetteurs, initialDomaine);
  const [actif, setActif] = useState<string | null>(null);
  // La carte garde tous les points filtrés ; seule la liste se restreint à ce
  // qui est visible à l'écran, et se met à jour quand on déplace la carte.
  const [cadrage, setCadrage] = useState<MapBounds | null>(null);
  const visibles = useMemo(
    () => (cadrage ? filtres.filter((t) => dansLeCadrage(t, cadrage)) : filtres),
    [filtres, cadrage]
  );
  const horsCadre = filtres.length - visibles.length;
  const focus = useMemo(
    () => (position ? { ...position, rayonKm } : null),
    [position, rayonKm]
  );

  return (
    <div className="flex flex-col">
      <div className="grid min-h-[70vh] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Filtres */}
        <div className="flex flex-col gap-6 border-b border-border bg-background p-7 lg:border-r lg:border-b-0">
          <div>
            <div className="mb-2 text-xs tracking-wider text-primary uppercase">
              La carte des transmetteurs
            </div>
            <h1 className="mb-2 font-serif text-3xl font-semibold leading-tight">
              Chaque point est quelqu&apos;un qui transmet
            </h1>
            <p className="text-sm text-muted-foreground">
              Cliquez sur un point pour un aperçu, puis sur l&apos;aperçu pour
              ouvrir la fiche.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Rechercher</span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Un nom, un savoir-faire…"
              className="rounded-sm border border-input bg-card px-3 py-2 text-sm"
            />
          </label>

          <div>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Domaine
              </span>
              <button
                type="button"
                onClick={resetFiltres}
                className="text-xs text-primary"
              >
                Tout effacer
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {DOMAINE_OPTIONS.map((d) => {
                const count =
                  d === "toutes"
                    ? transmetteurs.length
                    : transmetteurs.filter((t) => t.domaine === d).length;
                const label = d === "toutes" ? "Tous les domaines" : DOMAINE_LABELS[d];
                const on = domaine === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomaine(d)}
                    className={`flex items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm font-medium ${
                      on ? "bg-accent text-primary" : "text-foreground/80"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-xs tracking-wide text-muted-foreground uppercase">
              Formes proposées
            </div>
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
                        : "border-input bg-card text-foreground/80"
                    }`}
                  >
                    {nom}
                  </button>
                );
              })}
            </div>
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

          <div className="border-t border-border pt-5">
            <div className="mb-2.5 text-xs tracking-wide text-muted-foreground uppercase">
              Autour de moi
            </div>
            {position ? (
              <div className="flex flex-col gap-2">
                <select
                  value={rayonKm}
                  onChange={(e) => setRayonKm(Number(e.target.value))}
                  className="rounded-sm border border-input bg-card px-2.5 py-2 text-sm"
                >
                  {RAYONS_KM.map((r) => (
                    <option key={r} value={r}>
                      Cadrer sur {r} km autour de moi
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  La liste suit ensuite la carte : dézoomez pour élargir la
                  recherche.
                </p>
                <button
                  type="button"
                  onClick={() => setPosition(null)}
                  className="text-left text-xs text-primary"
                >
                  Oublier ma position
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onUseLocation}
                className="rounded-sm border border-input bg-card px-3 py-2 text-xs font-medium"
              >
                Utiliser ma position
              </button>
            )}
            {geoErreur && (
              <p className="mt-2 text-xs text-destructive">{geoErreur}</p>
            )}
          </div>

          <div className="border-t border-border pt-5 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {visibles.length}
            </strong>{" "}
            transmetteurs dans la vue.
            {horsCadre > 0 && (
              <span className="mt-1 block text-xs">
                {horsCadre} autre{horsCadre > 1 ? "s" : ""} hors du cadre —
                dézoomez ou déplacez la carte.
              </span>
            )}
          </div>
        </div>

        {/* Carte */}
        <div className="min-h-[420px] bg-secondary p-5">
          <div className="h-full min-h-[400px] overflow-hidden rounded-sm border border-border">
            <FranceMap
              points={filtres}
              activeId={actif}
              onHover={setActif}
              onBoundsChange={setCadrage}
              focus={focus}
            />
          </div>
        </div>
      </div>

      {/* Liste complète */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-3xl font-semibold">
              <strong>{visibles.length}</strong> transmetteurs
              <span className="ml-2 text-base font-normal text-muted-foreground">
                dans la zone affichée
              </span>
            </h2>
          </div>

          {visibles.length === 0 ? (
            <div className="rounded-sm border border-border bg-card p-12 text-center">
              <div className="mb-2 font-serif text-xl font-semibold">
                {filtres.length > 0
                  ? "Aucun transmetteur dans cette zone"
                  : "Aucun transmetteur ne correspond"}
              </div>
              <div className="mb-4 text-sm text-muted-foreground">
                {filtres.length > 0
                  ? `Déplacez ou dézoomez la carte : ${filtres.length} transmetteur${filtres.length > 1 ? "s correspondent" : " correspond"} à vos filtres ailleurs en France.`
                  : "Élargissez les filtres pour voir plus de résultats."}
              </div>
              {filtres.length === 0 && (
                <button
                  type="button"
                  onClick={resetFiltres}
                  className="rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((t) => (
                <Link
                  key={t.id}
                  href={`/fiche/${t.slug}`}
                  onMouseEnter={() => setActif(t.id)}
                  onMouseLeave={() => setActif(null)}
                  className={`flex h-92 flex-col overflow-hidden rounded-sm border bg-card ${
                    actif === t.id ? "border-primary" : "border-border"
                  }`}
                >
                  {/* Emplacement toujours présent, même sans photo, pour que
                      toutes les fiches gardent le même gabarit. */}
                  <div className="relative h-52 w-full shrink-0 bg-secondary">
                    {t.photo && (
                      <Image
                        src={t.photo}
                        alt={t.nom}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 rounded-sm bg-accent px-2 py-1 text-[11px] tracking-wide text-primary uppercase">
                      {DOMAINE_LABELS[t.domaine]}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {t.lieuApproximatif}
                    </span>
                  </div>
                  <div>
                    <div className="line-clamp-1 font-serif text-xl font-semibold leading-tight">
                      {t.nom}
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm font-medium text-primary">
                      {t.savoirFaire}
                    </div>
                  </div>
                  <div className="mt-auto flex gap-1.5 overflow-hidden">
                    {t.types.slice(0, 2).map((ty) => (
                      <span
                        key={ty}
                        className="truncate rounded-sm border border-border bg-secondary px-2 py-1 text-xs whitespace-nowrap text-muted-foreground"
                      >
                        {ty}
                      </span>
                    ))}
                    {t.types.length > 2 && (
                      <span
                        title={t.types.slice(2).join(", ")}
                        className="shrink-0 rounded-sm border border-border bg-secondary px-2 py-1 text-xs whitespace-nowrap text-muted-foreground"
                      >
                        +{t.types.length - 2}
                      </span>
                    )}
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
