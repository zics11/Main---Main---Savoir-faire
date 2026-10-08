"use client";

import Image from "next/image";
import { initiales } from "@/lib/initiales";

// Les trois pièces communes aux deux menus — celui du site et celui de
// l'administration : le portrait qui sert de poignée au compte, le chevron
// qui dit qu'un menu se déplie, et le bouton qui replie tout quand l'écran
// se resserre.

/**
 * Le visage du transmetteur : un portrait se reconnaît plus vite qu'un mot.
 * Sans photo (fiche neuve, compte de l'association), ses initiales prennent
 * la place.
 */
export function Portrait({
  portrait,
  identite,
  taille,
  fond = "border-border bg-accent text-primary",
}: {
  portrait: string | null;
  identite: string;
  taille: number;
  /** Couleurs du cercle, à accorder au fond du menu. */
  fond?: string;
}) {
  return (
    <span
      style={{ width: taille, height: taille }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-serif text-xs ${fond}`}
    >
      {portrait ? (
        <Image
          src={portrait}
          alt=""
          fill
          sizes={`${taille}px`}
          className="object-cover"
        />
      ) : (
        initiales(identite)
      )}
    </span>
  );
}

export function Chevron({ ouvert }: { ouvert: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform ${ouvert ? "rotate-180" : ""}`}
    >
      <path
        d="M2 4.5 6 8.5 10 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Burger({ ouvert }: { ouvert: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5">
      {ouvert ? (
        <path
          d="M5 5 15 15M15 5 5 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M3 6h14M3 10h14M3 14h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
