import type { Domaine } from "@/lib/db/schema";

// Ported from the legacy static site's inline SVG icons (one per domaine),
// same hand-drawn circle-badge style, same palette.
const T = "#a3512a";
const G = "#c98b5e";
const D = "#2b2620";
const C = "#faf8f4";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 96"
      width="120"
      height="96"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="60" cy="50" r="38" fill={C} />
      <circle cx="60" cy="50" r="38" stroke={D} strokeWidth="1.5" strokeDasharray="2 6" />
      {children}
    </svg>
  );
}

const ICONS: Record<Domaine, React.ReactNode> = {
  habitat: (
    <Badge>
      <g transform="rotate(-4 60 52)">
        <rect x="42" y="46" width="36" height="26" fill={T} />
        <path d="M36 48 L60 28 L84 48 Z" fill={G} />
        <rect x="55" y="56" width="10" height="16" fill={C} />
        <circle cx="48" cy="53" r="3.5" fill={C} />
      </g>
      <circle cx="90" cy="26" r="3" fill={G} />
      <circle cx="28" cy="70" r="2.5" fill={T} />
    </Badge>
  ),
  artisanat: (
    <Badge>
      <g transform="rotate(6 60 52)">
        <rect x="56" y="34" width="8" height="34" rx="3" fill={G} />
        <rect x="42" y="26" width="36" height="14" rx="4" fill={T} />
      </g>
      <rect x="42" y="68" width="36" height="6" rx="3" fill={D} />
      <circle cx="88" cy="66" r="2.5" fill={T} />
      <circle cx="30" cy="30" r="3" fill={G} />
    </Badge>
  ),
  alimentation: (
    <Badge>
      <g transform="rotate(-6 60 52)">
        <rect x="36" y="40" width="48" height="28" rx="14" fill={T} />
        <path d="M48 46 l6 8 M60 44 l6 8 M72 46 l6 8" stroke={C} strokeWidth="3" />
      </g>
      <path d="M52 30 q3 -6 0 -10 M62 32 q3 -6 0 -10" stroke={G} strokeWidth="2.5" />
      <circle cx="90" cy="62" r="3" fill={G} />
      <circle cx="30" cy="64" r="2.5" fill={T} />
    </Badge>
  ),
  jardin_nature: (
    <Badge>
      <path d="M60 70 V44" stroke={G} strokeWidth="3" />
      <ellipse cx="49" cy="42" rx="10" ry="6" transform="rotate(-30 49 42)" fill={G} />
      <ellipse cx="71" cy="42" rx="10" ry="6" transform="rotate(30 71 42)" fill={G} />
      <circle cx="86" cy="26" r="7" fill={T} />
      <rect x="44" y="68" width="32" height="8" rx="3" fill={T} />
      <circle cx="30" cy="60" r="2.5" fill={T} />
    </Badge>
  ),
};

export function DomaineIllustration({ domaine }: { domaine: Domaine }) {
  return ICONS[domaine];
}
