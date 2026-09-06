"use client";

import { useEffect, useRef } from "react";

/**
 * Publie la hauteur réelle de l'en-tête collant dans `--hauteur-entete`, dont
 * se sert le `scroll-padding-top` global pour que les ancres (#stage-…)
 * n'arrivent pas cachées dessous.
 *
 * Cette hauteur est mesurée plutôt que codée en dur : l'en-tête passe à la
 * ligne selon la largeur (79 px en grand écran, jusqu'à 211 px en très
 * étroit), à des seuils qui dépendent de son contenu — variable selon la
 * session — et ne suivent donc pas les points de rupture Tailwind.
 */
export function HauteurEntete() {
  const repere = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const entete = repere.current?.closest("header");
    if (!entete) return;

    const mesurer = () => {
      document.documentElement.style.setProperty(
        "--hauteur-entete",
        `${entete.getBoundingClientRect().height}px`
      );
    };

    // Mesure synchrone d'abord : le rappel du ResizeObserver arrive trop tard
    // pour le repositionnement ci-dessous.
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(entete);

    // Sur une arrivée directe sur une URL à ancre, le navigateur a déjà
    // défilé avec la valeur de repli — trop courte dès que l'en-tête passe à
    // la ligne. On repositionne une fois la hauteur réelle connue.
    const cible = window.location.hash
      ? document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
      : null;
    cible?.scrollIntoView();

    return () => observateur.disconnect();
  }, []);

  return <span ref={repere} hidden />;
}
