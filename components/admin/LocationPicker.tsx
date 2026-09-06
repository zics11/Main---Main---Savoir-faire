"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/components/map/maplibre-worker-setup";
import { appliquerLibellesFr } from "@/components/map/libelles-fr";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/**
 * Click-to-place point picker. On purpose there is no address search box:
 * only an approximate location (a click on the map) is ever stored, to
 * protect transmetteurs' privacy — the exact address is never entered.
 */
export function LocationPicker({
  lat: initialLat,
  lng: initialLng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat !== null && initialLng !== null
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: coords ? [coords.lng, coords.lat] : [2.5, 46.6],
      zoom: coords ? 11 : 4.8,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.on("load", () => appliquerLibellesFr(map));
    mapRef.current = map;

    if (coords) {
      markerRef.current = new maplibregl.Marker({ color: "#a3512a" })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
    }

    map.on("click", (e) => {
      const { lat, lng } = e.lngLat;
      setCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#a3512a" })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-sm border border-input"
      />
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      <p className="mt-2 text-xs text-muted-foreground">
        {coords
          ? `Point placé — ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          : "Cliquez sur la carte pour placer le point approximatif."}
      </p>
    </div>
  );
}
