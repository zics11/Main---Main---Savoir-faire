"use client";

import { createContext, useContext, useEffect } from "react";

// Ce qui a été modifié sans être enregistré doit se voir — et ne pas se
// perdre par mégarde. Chaque formulaire déclare son état ici : les onglets
// d'édition marquent celui qui attend un enregistrement, et le navigateur
// demande confirmation avant de quitter la page.

type Signaler = (zone: string, modifie: boolean) => void;

const Contexte = createContext<Signaler | null>(null);

export const FournisseurModifications = Contexte.Provider;

/** Déclare si la zone `zone` (« fiche », « stages »…) a des modifications en attente. */
export function useModificationsEnCours(zone: string, modifie: boolean) {
  const signaler = useContext(Contexte);

  useEffect(() => {
    signaler?.(zone, modifie);
  }, [signaler, zone, modifie]);

  // Au démontage, la zone n'a plus rien en attente.
  useEffect(() => () => signaler?.(zone, false), [signaler, zone]);

  useEffect(() => {
    if (!modifie) return;
    const retenir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", retenir);
    return () => window.removeEventListener("beforeunload", retenir);
  }, [modifie]);
}
