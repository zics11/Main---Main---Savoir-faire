import type * as maplibregl from "maplibre-gl";

/**
 * Le fond de carte CARTO affiche ses étiquettes en anglais par défaut. Ses
 * tuiles (schéma OpenMapTiles) embarquent aussi les noms localisés : on
 * réécrit donc le `text-field` de chaque couche de libellés pour préférer le
 * français, avec repli sur le nom latin puis le nom local.
 */
export function appliquerLibellesFr(map: maplibregl.Map) {
  for (const couche of map.getStyle().layers ?? []) {
    if (couche.type !== "symbol") continue;
    if (!couche.layout || !("text-field" in couche.layout)) continue;
    map.setLayoutProperty(couche.id, "text-field", [
      "coalesce",
      ["get", "name:fr"],
      ["get", "name:latin"],
      ["get", "name"],
    ]);
  }
}
