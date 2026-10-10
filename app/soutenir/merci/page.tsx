import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TemoinDon } from "@/components/dons/TemoinDon";
import { donsVisibles } from "@/lib/dons-serveur";
import { bouton, surtitre, titre } from "@/lib/style";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Merci — Main à Main",
  robots: { index: false, follow: false },
};

/** Le retour du paiement : merci, et plus d'encart pendant quelque temps. */
export default async function MerciDonPage() {
  await connection();
  if (!donsVisibles()) notFound();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-20">
        <TemoinDon />
        <div className={cn("mb-2", surtitre, "text-[var(--soutien)]")}>
          Soutenir
        </div>
        <h1 className={`mb-3 ${titre.page}`}>Merci pour votre don</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Grâce à vous, Main à Main reste gratuit et sans commission, pour
          celles et ceux qui transmettent comme pour celles et ceux qui
          apprennent.
        </p>
        <Link href="/stages" className={bouton.primaire}>
          Découvrir les stages
        </Link>
      </main>
      <Footer />
    </div>
  );
}
