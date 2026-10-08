"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LienMonCompte,
  ModaleMonCompte,
} from "@/components/compte/ModaleMonCompte";
import { Burger, Chevron, Portrait } from "@/components/site/PiecesMenu";

// Même menu que le site public, dans les couleurs de l'administration et sans
// la recherche : les pages à gauche du bouton, la création de fiche en
// évidence, et tout ce qui touche au compte derrière le portrait.

type Lien = { href: string; label: string; exact?: boolean };

const PAGES: Lien[] = [
  { href: "/admin", label: "Toutes les fiches", exact: true },
  { href: "/", label: "Voir le site public", exact: true },
];

const CREER = { href: "/admin/fiches/nouvelle", label: "Créer une fiche" };

const encre = "text-[#faf8f4] hover:text-[#d9925f]";

export function NavigationAdmin({
  email,
  nom,
  portrait,
  deconnexion,
}: {
  email: string;
  /** Nom de la fiche rattachée au compte, à défaut l'adresse. */
  nom: string | null;
  portrait: string | null;
  deconnexion: () => Promise<void>;
}) {
  const pathname = usePathname();
  // On retient la page sur laquelle chaque menu a été ouvert : changer de
  // page le referme donc tout seul.
  const [panneauOuvertSur, setPanneauOuvertSur] = useState<string | null>(null);
  const [compteOuvertSur, setCompteOuvertSur] = useState<string | null>(null);
  const panneau = panneauOuvertSur === pathname;
  const compte = compteOuvertSur === pathname;
  const zoneCompte = useRef<HTMLDivElement>(null);
  // Tenue ici, et non dans le volet qui l'ouvre : celui-ci se referme au clic.
  const [modaleCompte, setModaleCompte] = useState(false);
  const identite = nom ?? email;

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

  const fermer = () => {
    setPanneauOuvertSur(null);
    setCompteOuvertSur(null);
  };

  const actif = (l: Lien) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  const boutonCreer =
    "rounded-sm bg-[#a3512a] px-4 py-2.5 text-center text-sm font-semibold whitespace-nowrap text-[#faf8f4] shadow-sm hover:bg-[#8a4222]";

  const liensCompte = (marge: string) => (
    <>
      <LienMonCompte
        onOuvrir={() => {
          fermer();
          setModaleCompte(true);
        }}
        className={`block ${marge} py-2.5 text-sm ${encre}`}
      />
      <form
        action={deconnexion}
        className="mt-1 border-t border-[#4a453d] pt-1"
      >
        <button
          type="submit"
          className={`w-full ${marge} py-2.5 text-left text-sm ${encre}`}
        >
          Se déconnecter
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Grand écran */}
      <nav className="hidden items-center gap-x-5 text-sm font-medium whitespace-nowrap xl:gap-x-7 min-[1100px]:flex">
        {PAGES.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif(l) ? "page" : undefined}
            className={`${encre} ${
              actif(l)
                ? "underline decoration-[#d9925f] decoration-2 underline-offset-8"
                : ""
            }`}
          >
            {l.label}
          </Link>
        ))}

        <div className="flex items-center gap-x-5 xl:gap-x-7">
          <Link href={CREER.href} className={boutonCreer}>
            {CREER.label}
          </Link>

          {/* Séparateur : à gauche l'administration, à droite le compte. */}
          <span aria-hidden className="h-6 w-px bg-[#4a453d]" />

          <div ref={zoneCompte} className="relative">
            <button
              type="button"
              onClick={() => setCompteOuvertSur(compte ? null : pathname)}
              aria-expanded={compte}
              aria-haspopup="menu"
              aria-label={`Mon compte — ${identite}`}
              className={`flex items-center gap-1.5 rounded-full ${encre}`}
            >
              <Portrait
                portrait={portrait}
                identite={identite}
                taille={36}
                fond="border-[#4a453d] bg-[#3a352e] text-[#d9925f]"
              />
              <span className="hidden xl:inline">
                <Chevron ouvert={compte} />
              </span>
            </button>
            {compte && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-sm border border-[#4a453d] bg-[#2b2620] py-1 shadow-lg"
              >
                <div className="px-4 pt-2 pb-3">
                  <p className="truncate text-sm font-medium text-[#faf8f4]">
                    {identite}
                  </p>
                  {nom && (
                    <p className="truncate text-xs text-[#cfc8bb]">{email}</p>
                  )}
                </div>
                <div className="border-t border-[#4a453d] pt-1">
                  {liensCompte("px-4")}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Écran étroit : tout passe derrière un seul bouton. */}
      <button
        type="button"
        onClick={() => setPanneauOuvertSur(panneau ? null : pathname)}
        aria-expanded={panneau}
        aria-controls="menu-admin"
        aria-label={panneau ? "Fermer le menu" : "Ouvrir le menu"}
        className={`flex h-10 w-10 items-center justify-center rounded-sm border border-[#4a453d] ${encre} min-[1100px]:hidden`}
      >
        <Burger ouvert={panneau} />
      </button>

      {modaleCompte && (
        <ModaleMonCompte onFermer={() => setModaleCompte(false)} />
      )}

      {panneau && (
        <div
          id="menu-admin"
          className="w-full border-t border-[#4a453d] pt-4 min-[1100px]:hidden"
        >
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {PAGES.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={fermer}
                aria-current={actif(l) ? "page" : undefined}
                className={`py-2.5 ${encre}`}
              >
                {l.label}
              </Link>
            ))}

            <Link
              href={CREER.href}
              onClick={fermer}
              className={`mt-3 ${boutonCreer}`}
            >
              {CREER.label}
            </Link>

            <div className="mt-4 border-t border-[#4a453d] pt-2">
              <div className="flex items-center gap-3 pt-2 pb-3">
                <Portrait
                  portrait={portrait}
                  identite={identite}
                  taille={36}
                  fond="border-[#4a453d] bg-[#3a352e] text-[#d9925f]"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#faf8f4]">
                    {identite}
                  </p>
                  {nom && (
                    <p className="truncate text-xs text-[#cfc8bb]">{email}</p>
                  )}
                </div>
              </div>
              {liensCompte("px-0")}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
