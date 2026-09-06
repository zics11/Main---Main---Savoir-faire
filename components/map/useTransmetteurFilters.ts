"use client";

import { useMemo, useState } from "react";
import type { Domaine } from "@/lib/db/schema";
import type { TransmetteurPoint } from "./types";

export const RAYONS_KM = [25, 50, 100, 200, 500];

/**
 * État des filtres de la carte.
 *
 * `position` et `rayonKm` ne filtrent pas la liste : c'est le cadrage de la
 * carte qui fait office de filtre géographique (voir MapExplorer). Ils servent
 * uniquement à recadrer la vue sur « autour de moi » — sinon les deux se
 * contrediraient, et dézoomer n'afficherait jamais rien de plus.
 */
export function useTransmetteurFilters(
  transmetteurs: TransmetteurPoint[],
  initialDomaine: Domaine | "toutes" = "toutes"
) {
  const [domaine, setDomaine] = useState<Domaine | "toutes">(initialDomaine);
  const [recherche, setRecherche] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [hebergement, setHebergement] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [rayonKm, setRayonKm] = useState(100);
  const [geoErreur, setGeoErreur] = useState<string | null>(null);

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

  const q = recherche.trim().toLowerCase();

  const filtres = useMemo(() => {
    return transmetteurs
      .filter((t) => domaine === "toutes" || t.domaine === domaine)
      .filter(
        (t) =>
          q === "" ||
          t.nom.toLowerCase().includes(q) ||
          t.savoirFaire.toLowerCase().includes(q)
      )
      .filter((t) => types.length === 0 || types.some((ty) => t.types.includes(ty)))
      .filter((t) => !hebergement || t.hebergement);
  }, [transmetteurs, domaine, q, types, hebergement]);

  const resetFiltres = () => {
    setDomaine("toutes");
    setRecherche("");
    setTypes([]);
    setHebergement(false);
    setPosition(null);
  };

  return {
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
  };
}
