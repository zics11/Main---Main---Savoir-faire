import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { NouveauMotDePasseForm } from "@/components/compte/NouveauMotDePasseForm";
import { compteDuJetonReinit } from "@/lib/activation";

export default async function NouveauMotDePassePage({
  params,
}: PageProps<"/nouveau-mot-de-passe/[token]">) {
  const { token } = await params;
  const compte = await compteDuJetonReinit(token);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className="mb-2 text-xs tracking-wider text-primary uppercase">
          Mot de passe
        </div>

        {compte ? (
          <>
            <h1 className="mb-3 font-serif text-4xl font-semibold">
              Choisissez votre nouveau mot de passe
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              Pour le compte{" "}
              <strong className="text-foreground">{compte.email}</strong>. Une
              fois enregistré, vous arrivez directement sur votre espace.
            </p>
            <NouveauMotDePasseForm jeton={token} />
          </>
        ) : (
          <>
            <h1 className="mb-3 font-serif text-4xl font-semibold">
              Ce lien n&apos;est plus valable
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              Il a peut-être déjà servi, ou dépassé ses 2 heures. Votre mot de
              passe actuel reste valable ; demandez un nouveau lien si besoin.
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="rounded-sm bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
            >
              Demander un nouveau lien
            </Link>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
