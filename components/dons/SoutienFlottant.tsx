"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { HeartIcon } from "lucide-react";
import { lienSoutien, TEMOIN_DON } from "@/lib/dons";
import { cn } from "@/lib/utils";

// L'invitation à donner, sur tout le site public : un bouton discret en bas
// à droite, qui mène à la page Soutenir. Il disparaît trois mois après un
// don.

/** Les pages où il a sa place : celles qu'on parcourt pour découvrir. */
const PAGES = [/^\/$/, /^\/carte/, /^\/stages/, /^\/journal/, /^\/fiche\//];

/** Un don récent ? Le témoin est posé par la page de remerciement. */
function aDonne() {
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${TEMOIN_DON}=`));
}

// Le témoin ne prévient de rien quand il change : la valeur est relue à
// chaque rendu, donc à chaque changement de page.
const abonner = () => () => {};

export function SoutienFlottant() {
  const pathname = usePathname();
  // Côté serveur, rien : le navigateur seul sait s'il y a eu un don.
  const cache = useSyncExternalStore(abonner, aDonne, () => true);

  if (cache || !PAGES.some((p) => p.test(pathname))) return null;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6",
        // Sur la page Stages, la carte descend jusqu'en bas de l'écran : on
        // laisse lisible la mention de ses sources, en bas à droite.
        pathname.startsWith("/stages") && "lg:bottom-12",
      )}
    >
      <Link
        href={lienSoutien("flottant")}
        aria-label="Soutenir Main à Main"
        className="flex items-center gap-2 rounded-sm bg-[var(--soutien)] px-3.5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[var(--soutien-survol)] hover:text-white sm:px-4"
      >
        <HeartIcon aria-hidden className="h-4 w-4 fill-white/25" />
        {/* Sur téléphone, le cœur seul : il ne couvre presque rien. */}
        <span className="hidden sm:inline">Soutenir Main à Main</span>
      </Link>
    </div>
  );
}
