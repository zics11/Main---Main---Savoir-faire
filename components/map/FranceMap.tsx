"use client";

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import { DOMAINE_LABELS } from "@/lib/constants";
import { etiquette as classeEtiquette } from "@/lib/style";
import type { MapBounds, TransmetteurPoint } from "./types";
import { appliquerLibellesFr } from "./libelles-fr";
import "./maplibre-worker-setup";

// Free, no-API-key basemap (CARTO Positron), matching the site's light,
// low-saturation look.
const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Spec: cluster once there are more than ~50 points on the map.
const CLUSTER_THRESHOLD = 50;

/**
 * Vignette affichée au clic sur un point : un aperçu cliquable qui mène à la
 * fiche. Construite en DOM natif (et non en JSX) car MapLibre gère lui-même
 * le contenu de ses bulles, hors de l'arbre React — mais elle reprend, en
 * petit, la vignette de la liste et l'en-tête de la fiche : domaine et
 * savoir-faire en petites capitales, titre de la fiche, lieu.
 */
function construireVignette(point: TransmetteurPoint) {
  const el = (
    balise: string,
    style: Partial<CSSStyleDeclaration>,
    texte?: string,
  ) => {
    const e = document.createElement(balise);
    Object.assign(e.style, style);
    if (texte !== undefined) e.textContent = texte;
    return e;
  };

  const lien = el("a", {
    display: "block",
    textDecoration: "none",
    color: "var(--foreground)",
    width: "240px",
  }) as HTMLAnchorElement;
  lien.href = `/fiche/${point.slug}`;

  if (point.photo) {
    const img = el("img", {
      display: "block",
      width: "100%",
      height: "120px",
      objectFit: "cover",
    }) as HTMLImageElement;
    img.src = point.photo;
    img.alt = point.titre;
    lien.appendChild(img);
  }

  const corps = el("div", { padding: "12px 14px 14px" });
  corps.append(
    el(
      "div",
      {
        fontSize: "12px",
        fontWeight: "500",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--primary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      `${DOMAINE_LABELS[point.domaine]} · ${point.savoirFaire}`,
    ),
    el(
      "div",
      {
        fontFamily: "var(--font-cormorant), Georgia, serif",
        fontSize: "20px",
        fontWeight: "600",
        lineHeight: "1.2",
        marginTop: "4px",
      },
      point.titre,
    ),
    el(
      "div",
      { fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" },
      point.titre !== point.nom
        ? `${point.nom} · ${point.lieuCourt}`
        : point.lieuCourt,
    ),
    formes(point.types),
    el(
      "div",
      {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--primary)",
        marginTop: "10px",
      },
      "Voir la fiche →",
    ),
  );
  lien.appendChild(corps);
  return lien;
}

/**
 * Les formes proposées, dans l'étiquette de tout le site : les deux
 * premières, puis « +N ».
 */
function formes(types: string[]) {
  const ligne = document.createElement("div");
  Object.assign(ligne.style, {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: types.length ? "10px" : "0",
  });
  // La bulle vit hors de React : elle ne peut pas employer EtiquetteForme,
  // mais elle reprend exactement sa définition (lib/style).
  const etiquette = (texte: string) => {
    const e = document.createElement("span");
    e.textContent = texte;
    e.className = classeEtiquette;
    return e;
  };
  types.slice(0, 2).forEach((t) => ligne.appendChild(etiquette(t)));
  if (types.length > 2) {
    const reste = etiquette(`+${types.length - 2}`);
    reste.title = types.slice(2).join(", ");
    ligne.appendChild(reste);
  }
  return ligne;
}

// Hors du composant : une fonction recréée à chaque rendu relancerait le
// dessin de tous les points.
const infobulleTransmetteur = (p: TransmetteurPoint) =>
  `${p.titre} — ${p.savoirFaire} (${p.lieuApproximatif})`;

export function FranceMap({
  points,
  activeId,
  onHover,
  onBoundsChange,
  focus,
  vignette = construireVignette,
  infobulle = infobulleTransmetteur,
}: {
  points: TransmetteurPoint[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  /**
   * La bulle ouverte au clic sur un point. Par défaut, celle d'un
   * transmetteur ; la page Stages y montre plutôt les stages du lieu.
   */
  vignette?: (point: TransmetteurPoint) => HTMLElement;
  /** Le texte affiché au survol d'un point. */
  infobulle?: (point: TransmetteurPoint) => string;
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
  const vignetteRef = useRef(vignette);
  const infobulleRef = useRef(infobulle);

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
      el.title = infobulleRef.current(point);
      stylerPoint(el, active);
      el.addEventListener("mouseenter", () => onHover(point.id));
      el.addEventListener("mouseleave", () => onHover(null));
      const vignette = new maplibregl.Popup({
        offset: 14,
        // Ne pas donner le focus à la bulle : sur un clic de souris, son
        // premier lien s'entourait du cadre de focus, comme sélectionné. Au
        // clavier, Tab y mène toujours.
        focusAfterOpen: false,
        // Chaque bulle fixe sa propre largeur.
        maxWidth: "none",
        className: "vignette-transmetteur",
      }).setDOMContent(vignetteRef.current(point));
      pointMarkersRef.current.set(
        point.id,
        new maplibregl.Marker({ element: el })
          .setLngLat([point.lng, point.lat])
          .setPopup(vignette)
          .addTo(map),
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
        })),
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
              index.getClusterExpansionZoom(cluster.id as number),
            );
            map.easeTo({ center: [lng, lat], zoom: expansionZoom });
          };
          clusterMarkersRef.current.push(
            new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(map),
          );
        } else {
          const point = currentPoints.find(
            (p) => p.id === cluster.properties.id,
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
      "top-right",
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
      { padding: 40, duration: 800 },
    );
  }, [focus]);

  // re-render markers whenever the filtered point list or hover target changes
  useEffect(() => {
    pointsRef.current = points;
    activeIdRef.current = activeId;
    vignetteRef.current = vignette;
    infobulleRef.current = infobulle;
    if (mapRef.current?.isStyleLoaded()) render();
  }, [points, activeId, vignette, infobulle, render]);

  return <div ref={containerRef} className="h-full w-full" />;
}
