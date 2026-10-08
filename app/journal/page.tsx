import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { surtitre } from "@/lib/style";

export const metadata: Metadata = {
  title: "Le journal — Main à Main",
  description:
    "Récits d'ateliers, portraits de transmetteurs et nouvelles de l'association.",
};

export default function JournalPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl">
          <p className={`mb-3 ${surtitre}`}>
            Le journal
          </p>
          <h1 className="mb-6 font-serif text-4xl leading-tight font-semibold">
            Les récits arrivent
          </h1>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Le journal réunira bientôt les récits d&apos;atelier, les portraits
            de transmetteurs et les nouvelles de l&apos;association. Le temps
            d&apos;écrire les premiers, cette page reste vide.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            En attendant, les savoir-faire se visitent{" "}
            <Link href="/carte">sur la carte</Link> et les prochaines dates se
            regardent du côté <Link href="/stages">des stages</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
