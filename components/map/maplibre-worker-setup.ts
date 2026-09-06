import * as maplibregl from "maplibre-gl";

// maplibre-gl resolves its worker script relative to its own import.meta.url,
// which Turbopack doesn't rewrite to a fetchable http(s) URL — the worker
// then silently fails to start, and tiles never load. Pointing it at a copy
// served from /public sidesteps that entirely (see package.json postinstall,
// which keeps this file in sync with the installed maplibre-gl version).
//
// Import this module (for its side effect) in every component that
// constructs a `new maplibregl.Map(...)`, before doing so.
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
