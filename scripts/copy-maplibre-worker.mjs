// maplibre-gl resolves its worker script relative to its own import.meta.url,
// which bundlers like Turbopack don't rewrite to a fetchable http(s) URL —
// the worker then fails to start and tiles never load (see FranceMap.tsx,
// which points maplibregl.setWorkerUrl() at these files instead). Runs on
// every `npm install` so the copies stay in sync with the pinned version.
import { copyFileSync } from "fs";

for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`node_modules/maplibre-gl/dist/${name}`, `public/${name}`);
}

console.log("Copied maplibre-gl worker files into public/");
