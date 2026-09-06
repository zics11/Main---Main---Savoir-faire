import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Frozen reference copy of the pre-migration static site — not linted
    // or maintained as part of the Next.js app.
    "legacy-html/**",
    // Vendored maplibre-gl worker bundles copied verbatim by
    // scripts/copy-maplibre-worker.mjs (see FranceMap.tsx) — not our code.
    "public/maplibre-gl-worker.mjs",
    "public/maplibre-gl-shared.mjs",
  ]),
]);

export default eslintConfig;
