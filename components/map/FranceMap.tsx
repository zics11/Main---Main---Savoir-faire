"use client";

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import type { MapBounds, TransmetteurPoint } from "./types";
import { appliquerLibellesFr } from "./libelles-fr";
import "./maplibre-worker-setup";

// Free, no-API-key basemap (CARTO Positron), matching the site's light,
// low-saturation look.
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Spec: cluster once there are more than ~50 points on the map.
const CLUSTER_THRESHOLD = 50;

/**
 * Vignette affichée au clic sur un point : un aperçu cliquable qui mène à la
 * fiche. Construite en DOM natif (et non en JSX) car MapLibre gère lui-même
 * le contenu de ses bulles, hors de l'arbre React.
 */
function construireVignette(point: TransmetteurPoint) {
  const lien = document.createElement("a");
  lien.href = `/fiche/${point.slug}`;
  Object.assign(lien.style, {
    display: "block",
    textDecoration: "none",
    color: "#2b2620",
    width: "240px",
  });

  if (point.photo) {
    const img = document.createElement("img");
    img.src = point.photo;
    img.alt = point.nom;
    Object.assign(img.style, {
      display: "block",
      width: "100%",
      height: "120px",
      objectFit: "cover",
    });
    lien.appendChild(img);
  }

  const corps = document.createElement("div");
  Object.assign(corps.style, { padding: "12px 14px 14px" });

  const lieu = document.createElement("div");
  lieu.textContent = point.lieuApproximatif;
  Object.assign(lieu.style, {
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#8a8072",
    marginBottom: "4px",
  });

  const nom = document.createElement("div");
  nom.textContent = point.nom;
  Object.assign(nom.style, {
    fontFamily: "Georgia, 'Cormorant Garamond', serif",
    fontSize: "18px",
    fontWeight: "600",
    lineHeight: "1.2",
  });

  const savoirFaire = document.createElement("div");
  savoirFaire.textContent = point.savoirFaire;
  Object.assign(savoirFaire.style, {
    fontSize: "13px",
    fontWeight: "500",
    color: "#a3512a",
    marginTop: "3px",
  });

  const cta = document.createElement("div");
  cta.textContent = "Voir la fiche →";
  Object.assign(cta.style, {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#a3512a",
    marginTop: "10px",
  });

  corps.append(lieu, nom, savoirFaire, cta);
  lien.appendChild(corps);
  return lien;
}

export function FranceMap({
  points,
  activeId,
  onHover,
  onBoundsChange,
  focus,
}: {
  points: TransmetteurPoint[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  /** Appelé au chargement puis à chaque déplacement/zoom de la carte. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Recadre la carte sur une zone (ex. « autour de moi ») quand il change. */
  focus?: { lat: number; lng: number; rayonKm: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Les marqueurs de points sont conservés d'un rendu à l'autre (indexés par
  // id) : les recréer fermerait la vignette ouverte dès qu'on bouge la carte.
  // Les pastilles de cluster, elles, dépendent du cadrage et sont refaites.
  const pointMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const clusterMarkersRef = useRef<maplibregl.Marker[]>([]);
  // kept in refs so the stable `render` callback always sees latest values
  const pointsRef = useRef(points);
  const activeIdRef = useRef(activeId);
  const onBoundsChangeRef = useRef(onBoundsChange);

  const render = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];

    const currentPoints = pointsRef.current;
    const currentActiveId = activeIdRef.current;
    const voulus = new Set<string>();

    const stylerPoint = (el: HTMLElement, active: boolean) => {
      const size = active ? 16 : 12;
      Object.assign(el.style, {
        display: "block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: active ? "#2b2620" : "#a3512a",
        border: "2px solid #faf8f4",
        boxShadow: "0 0 0 6px rgba(163,81,42,0.16)",
        cursor: "pointer",
      });
    };

    const addPointMarker = (point: TransmetteurPoint) => {
      voulus.add(point.id);
      const active = point.id === currentActiveId;

      const existant = pointMarkersRef.current.get(point.id);
      if (existant) {
        stylerPoint(existant.getElement(), active);
        return;
      }

      // Un bouton, pas un lien : le clic ouvre d'abord la vignette, c'est
      // elle qui mène ensuite à la fiche.
      const el = document.createElement("button");
      el.type = "button";
      el.title = `${point.nom} — ${point.savoirFaire} (${point.lieuApproximatif})`;
      stylerPoint(el, active);
      el.addEventListener("mouseenter", () => onHover(point.id));
      el.addEventListener("mouseleave", () => onHover(null));
      const vignette = new maplibregl.Popup({
        offset: 14,
        maxWidth: "240px",
        className: "vignette-transmetteur",
      }).setDOMContent(construireVignette(point));
      pointMarkersRef.current.set(
        point.id,
        new maplibregl.Marker({ element: el })
          .setLngLat([point.lng, point.lat])
          .setPopup(vignette)
          .addTo(map)
      );
    };

    if (currentPoints.length > CLUSTER_THRESHOLD) {
      const index = new Supercluster<{ id: string }>({
        radius: 50,
        maxZoom: 14,
      }).load(
        currentPoints.map((p) => ({
          type: "Feature",
          properties: { id: p.id },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        }))
      );

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const zoom = Math.round(map.getZoom());

      for (const cluster of index.getClusters(bbox, zoom)) {
        const [lng, lat] = cluster.geometry.coordinates;
        if ("cluster" in cluster.properties) {
          const count = cluster.properties.point_count;
          const el = document.createElement("button");
          el.type = "button";
          el.textContent = String(count);
          const size = 26 + Math.min(22, count);
          Object.assign(el.style, {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            background: "#a3512a",
            color: "#faf8f4",
            border: "2px solid #faf8f4",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
          });
          el.onclick = () => {
            const expansionZoom = Math.min(
              16,
              index.getClusterExpansionZoom(cluster.id as number)
            );
            map.easeTo({ center: [lng, lat], zoom: expansionZoom });
          };
          clusterMarkersRef.current.push(
            new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(map)
          );
        } else {
          const point = currentPoints.find(
            (p) => p.id === cluster.properties.id
          );
          if (point) addPointMarker(point);
        }
      }
    } else {
      currentPoints.forEach(addPointMarker);
    }

    // Retire les marqueurs qui n'ont plus lieu d'être (filtres, ou points
    // désormais regroupés dans un cluster).
    for (const [id, marker] of [...pointMarkersRef.current]) {
      if (!voulus.has(id)) {
        marker.remove();
        pointMarkersRef.current.delete(id);
      }
    }
  }, [onHover]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [2.5, 46.6],
      zoom: 4.8,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    mapRef.current = map;

    const publierCadrage = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    const onReady = () => {
      appliquerLibellesFr(map);
      render();
      publierCadrage();
    };
    const onMoveEnd = () => {
      render();
      publierCadrage();
    };
    map.on("load", onReady);
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("load", onReady);
      map.off("moveend", onMoveEnd);
      // map.remove() détruit la carte et, avec elle, tous ses marqueurs.
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Recadrage sur une zone donnée (~111 km par degré de latitude, resserré
  // sur la longitude à mesure qu'on monte vers le nord).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const dLat = focus.rayonKm / 111;
    const dLng = focus.rayonKm / (111 * Math.cos((focus.lat * Math.PI) / 180));
    map.fitBounds(
      [
        [focus.lng - dLng, focus.lat - dLat],
        [focus.lng + dLng, focus.lat + dLat],
      ],
      { padding: 40, duration: 800 }
    );
  }, [focus]);

  // re-render markers whenever the filtered point list or hover target changes
  useEffect(() => {
    pointsRef.current = points;
    activeIdRef.current = activeId;
    if (mapRef.current?.isStyleLoaded()) render();
  }, [points, activeId, render]);

  return <div ref={containerRef} className="h-full w-full" />;
}
