"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Burger, Chevron, Portrait } from "./PiecesMenu";
import {
  LienMonCompte,
  ModaleMonCompte,
} from "@/components/compte/ModaleMonCompte";
import { LienConnexion, ModaleConnexion } from "./ModaleConnexion";
import { NavLink } from "./NavLink";

// Le menu du site public. Trois zones, dans cet ordre de lecture : les pages,
// l'invitation à transmettre, puis le compte. Tout ce qui touche au compte est
// rangé derrière un seul bouton : avant, « Administration », « Mon compte » et
// « Se déconnecter » s'alignaient avec « La carte » et faisaient passer la
// barre à la ligne une fois connecté.

type Lien = { href: string; label: string };

const PAGES: Lien[] = [
  { href: "/carte", label: "La carte" },
  { href: "/stages", label: "Les stages" },
  { href: "/journal", label: "Le journal" },
  { href: "/#association", label: "L'association" },
];

const PROPOSER = { href: "/#transmettre", label: "Proposer une transmission" };

export function NavigationSite({
  espace,
  email,
  nom,
  portrait,
  deconnexion,
}: {
  /** Espace personnel selon le rôle, ou null si personne n'est connecté. */
  espace: Lien | null;
  email: string | null;
  /** Nom de la fiche rattachée au compte, à défaut l'adresse. */
  nom: string | null;
  /** Portrait de la fiche : le visage remplace le mot « compte ». */
  portrait: string | null;
  deconnexion: () => Promise<void>;
}) {
  const pathname = usePathname();
  // On retient la page sur laquelle chaque menu a été ouvert plutôt qu'un
  // simple booléen : changer de page le referme donc tout seul, sans effet à
  // déclencher, et rien ne reste ouvert par-dessus la page demandée.
  const [panneauOuvertSur, setPanneauOuvertSur] = useState<string | null>(null);
  const [compteOuvertSur, setCompteOuvertSur] = useState<string | null>(null);
  const panneau = panneauOuvertSur === pathname;
  const compte = compteOuvertSur === pathname;
  const zoneCompte = useRef<HTMLDivElement>(null);
  // Les deux fenêtres sont tenues ici, et non dans le volet qui les ouvre :
  // celui-ci se referme au clic, et les emporterait avec lui.
  const [modale, setModale] = useState<"connexion" | "compte" | null>(null);
  const connecte = email !== null;

  // Un menu déroulant se referme au clic à côté et à la touche Échap.
  useEffect(() => {
    if (!compte) return;
    const dehors = (e: MouseEvent) => {
      if (!zoneCompte.current?.contains(e.target as Node)) {
        setCompteOuvertSur(null);
      }
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompteOuvertSur(null);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [compte]);

  const identite = nom ?? email ?? "";

  const fermer = () => {
    setPanneauOuvertSur(null);
    setCompteOuvertSur(null);
  };

  const boutonProposer =
    "rounded-sm bg-primary px-4 py-2.5 text-center text-sm font-semibold whitespace-nowrap text-primary-foreground shadow-sm hover:bg-[#8a4222]";

  // Les mêmes liens servent au menu déroulant, qui a son propre rembourrage,
  // et au panneau mobile, où tout s'aligne sur le bord gauche.
  const liensCompte = (marge: string) => (
    <>
      {espace && (
        <Link
          href={espace.href}
          onClick={fermer}
          className={`block ${marge} py-2.5 text-sm text-foreground hover:bg-secondary`}
        >
          {espace.label}
        </Link>
      )}
      <LienMonCompte
        onOuvrir={() => {
          fermer();
          setModale("compte");
        }}
        className={`block ${marge} py-2.5 text-sm text-foreground hover:bg-secondary`}
      />
      <form action={deconnexion} className="mt-1 border-t border-border pt-1">
        <button
          type="submit"
          className={`w-full ${marge} py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-primary`}
        >
          Se déconnecter
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Grand écran */}
      <nav className="hidden items-center gap-x-4 text-sm font-medium whitespace-nowrap xl:gap-x-6 min-[1100px]:flex">
        {/* Le menu tient d'un bloc contre le bord droit ; le logo reste seul à
            gauche. La recherche l'ouvre, un peu plus large sur grand écran. */}
        <ChampRecherche id="recherche-entete" className="w-40 xl:w-60" />

        {PAGES.map((l) => (
          <NavLink key={l.href} href={l.href}>
            {l.label}
          </NavLink>
        ))}

        <div className="flex items-center gap-x-4 xl:gap-x-6">
          <Link href={PROPOSER.href} className={boutonProposer}>
            {PROPOSER.label}
          </Link>

          {/* Séparateur : à gauche le site, à droite le compte. */}
          <span aria-hidden className="h-6 w-px bg-border" />

          {!connecte && (
            <LienConnexion
              onOuvrir={() => setModale("connexion")}
              className="font-medium text-foreground hover:text-primary"
            />
          )}

          {connecte && (
            <div ref={zoneCompte} className="relative">
              <button
                type="button"
                onClick={() => setCompteOuvertSur(compte ? null : pathname)}
                aria-expanded={compte}
                aria-haspopup="menu"
                aria-label={`Mon compte — ${identite}`}
                className="flex items-center gap-1.5 rounded-full text-muted-foreground hover:text-primary"
              >
                <Portrait portrait={portrait} identite={identite} taille={36} />
                <span className="hidden xl:inline">
                  <Chevron ouvert={compte} />
                </span>
              </button>
              {compte && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-sm border border-border bg-card py-1 shadow-lg"
                >
                  <div className="px-4 pt-2 pb-3">
                    <p className="truncate text-sm font-medium">{identite}</p>
                    {nom && email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {email}
                      </p>
                    )}
                  </div>
                  <div className="border-t border-border pt-1">
                    {liensCompte("px-4")}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Téléphone et tablette : tout passe derrière un seul bouton. */}
      <button
        type="button"
        onClick={() => setPanneauOuvertSur(panneau ? null : pathname)}
        aria-expanded={panneau}
        aria-controls="menu-mobile"
        aria-label={panneau ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-border text-foreground min-[1100px]:hidden"
      >
        <Burger ouvert={panneau} />
      </button>

      {modale === "connexion" && (
        <ModaleConnexion onFermer={() => setModale(null)} />
      )}
      {modale === "compte" && (
        <ModaleMonCompte onFermer={() => setModale(null)} />
      )}

      {panneau && (
        <div
          id="menu-mobile"
          className="w-full border-t border-border pt-4 min-[1100px]:hidden"
        >
          <nav className="flex flex-col gap-1 text-sm font-medium">
            <ChampRecherche id="recherche-menu" className="mb-3 w-full" />

            {PAGES.map((l) => (
              <NavLink
                key={l.href}
                href={l.href}
                onClick={fermer}
                className="py-2.5"
              >
                {l.label}
              </NavLink>
            ))}

            <Link
              href={PROPOSER.href}
              onClick={fermer}
              className={`mt-3 ${boutonProposer}`}
            >
              {PROPOSER.label}
            </Link>

            <div className="mt-4 border-t border-border pt-2">
              {connecte ? (
                <>
                  <div className="flex items-center gap-3 pt-2 pb-3">
                    <Portrait
                      portrait={portrait}
                      identite={identite}
                      taille={36}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{identite}</p>
                      {nom && email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>
                  {liensCompte("px-0")}
                </>
              ) : (
                <LienConnexion
                  onOuvrir={() => {
                    fermer();
                    setModale("connexion");
                  }}
                  className="block py-2.5 text-sm text-foreground hover:text-primary"
                />
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

/**
 * Recherche de stages depuis n'importe quelle page : un simple formulaire
 * GET, qui mène à /stages avec le terme déjà saisi — rien à charger, et le
 * lien obtenu se partage.
 */
function ChampRecherche({ id, className }: { id: string; className: string }) {
  return (
    <form action="/stages" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Chercher un stage
      </label>
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Chercher un stage…"
        className="w-full rounded-sm border border-input bg-card py-2 pr-3 pl-8 text-sm"
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      >
        <circle
          cx="7"
          cy="7"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </form>
  );
}
