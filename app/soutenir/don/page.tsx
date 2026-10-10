import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  enEuros,
  estSource,
  lienEnSavoirPlus,
  lienSoutien,
  MONTANT_MAX,
  MONTANT_MIN,
} from "@/lib/dons";
import { etatDons, fournisseurDon } from "@/lib/dons-serveur";
import { bouton, surtitre, titre } from "@/lib/style";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Faire un don — Main à Main",
  robots: { index: false, follow: false },
};

/**
 * « Faire un don » : droit vers la page de paiement, sans repasser par les
 * explications — c'est le lien des emails et des montants des encarts. Tant
 * qu'aucun moyen de paiement n'est branché, l'aperçu dit ce qui se passerait.
 */
export default async function DonDirectPage({
  searchParams,
}: PageProps<"/soutenir/don">) {
  await connection();
  const etat = etatDons();
  if (etat === "fermes") notFound();

  const { montant, source, frequence } = await searchParams;
  const voulu = Number(montant);
  const somme =
    Number.isInteger(voulu) && voulu >= MONTANT_MIN && voulu <= MONTANT_MAX
      ? voulu
      : null;
  const origine = estSource(source) ? source : "page";
  const mensuel = frequence === "mensuel";

  const fournisseur = fournisseurDon();
  if (fournisseur) {
    redirect(
      await fournisseur.demarrer({
        montant: somme,
        mensuel,
        source: origine,
        retour: new URL(
          "/soutenir/merci",
          process.env.AUTH_URL ?? "http://localhost:3000",
        ).toString(),
      }),
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-[var(--statut-a-valider)] px-6 py-2.5 text-center text-sm text-white sm:px-12">
        Aperçu — aucun moyen de paiement n&apos;est encore branché : rien ne
        sera débité.
      </div>
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-20">
        <div className={cn("mb-2", surtitre, "text-[var(--soutien)]")}>
          Faire un don
        </div>
        <h1 className={`mb-3 ${titre.page}`}>Ici, la page de paiement</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Une fois un moyen de paiement branché, le donateur arrive directement
          sur sa page de paiement sécurisée
          {somme ? `, pour un don de ${enEuros(somme)}` : ""}
          {mensuel ? " par mois" : ""} — venu de « {origine} ». Rien à lire
          avant : les explications restent sur la page Soutenir.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={lienSoutien(origine, somme ?? undefined)}
            className={cn(
              bouton.primaire,
              "bg-[var(--soutien)] text-white hover:bg-[var(--soutien-survol)] hover:text-white",
            )}
          >
            Choisir un autre montant
          </Link>
          <Link
            href={lienEnSavoirPlus(origine)}
            className="text-sm font-medium text-[var(--soutien)] hover:text-[var(--soutien)] hover:underline"
          >
            En savoir plus
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
