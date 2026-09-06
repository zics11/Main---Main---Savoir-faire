"use client";

import { useState } from "react";
import { FranceMap } from "./FranceMap";
import type { TransmetteurPoint } from "./types";

// Thin client wrapper: a Server Component can't hand a function prop
// (onHover) across the RSC boundary, so any map embedded in server-rendered
// content goes through this local-hover-state wrapper instead.
export function MapPreview({
  points,
  forceActiveId,
}: {
  points: TransmetteurPoint[];
  forceActiveId?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <FranceMap
      points={points}
      activeId={hovered ?? forceActiveId ?? null}
      onHover={setHovered}
    />
  );
}
