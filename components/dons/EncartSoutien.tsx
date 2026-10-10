import Link from "next/link";
import { ArrowRightIcon, HeartIcon } from "lucide-react";
import {
  enEuros,
  lienDon,
  lienEnSavoirPlus,
  lienSoutien,
  MONTANT_PAR_DEFAUT,
  MONTANTS_CONSEILLES,
  type SourceDon,
} from "@/lib/dons";
import { cn } from "@/lib/utils";

/**
 * L'invitation à donner, la même partout : un cœur, une phrase qui dit
 * pourquoi, les montants conseillés — un clic mène droit au paiement —,
 * « Autre montant » vers le formulaire de don, et « En savoir plus » pour
 * tout comprendre avant.
 * Dans le vert des dons, comme le module « Faire un don ». Jamais bloquante :
 * on peut passer son chemin.
 */
export function EncartSoutien({
  source,
  titre,
  children,
  montants = MONTANTS_CONSEILLES,
  conseille = MONTANT_PAR_DEFAUT,
  suffixe = "",
  className,
}: {
  source: SourceDon;
  titre: string;
  children: React.ReactNode;
  montants?: readonly number[];
  /** Le montant mis en avant. */
  conseille?: number;
  /** Après chaque montant : « / an ». */
  suffixe?: string;
  className?: string;
}) {
  return (
    <aside
      aria-label="Soutenir Main à Main"
      className={cn(
        "rounded-sm border border-[var(--soutien)]/30 bg-card p-5 text-left",
        className,
      )}
    >
      <div className="flex gap-3">
        <HeartIcon
          aria-hidden
          className="mt-0.5 h-5 w-5 shrink-0 fill-[var(--soutien)]/15 text-[var(--soutien)]"
        />
        <div className="min-w-0">
          <p className="font-serif text-lg leading-snug font-semibold">
            {titre}
          </p>
          <div className="mt-1 text-sm leading-relaxed text-foreground/75">
            {children}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {montants.map((m) => (
              <Link
                key={m}
                href={lienDon(source, m)}
                // Pas de préchargement : ce lien démarre un paiement.
                prefetch={false}
                className={cn(
                  "rounded-sm border border-[var(--soutien)] px-3.5 py-2 text-sm font-semibold whitespace-nowrap",
                  m === conseille
                    ? "bg-[var(--soutien)] text-white hover:bg-[var(--soutien-survol)] hover:text-white"
                    : "bg-card text-[var(--soutien)] hover:bg-[var(--soutien-fond)] hover:text-[var(--soutien)]",
                )}
              >
                {enEuros(m)}
                {suffixe}
              </Link>
            ))}
            <Link
              href={`${lienSoutien(source)}#faire-un-don`}
              className="px-1.5 text-sm font-medium text-[var(--soutien)] hover:text-[var(--soutien)] hover:underline"
            >
              Autre montant
            </Link>
          </div>
          <Link
            href={lienEnSavoirPlus(source)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--soutien)] hover:text-[var(--soutien)] hover:underline"
          >
            En savoir plus
            <ArrowRightIcon aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
