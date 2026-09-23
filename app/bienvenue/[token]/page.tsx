import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PremierMotDePasseForm } from "@/components/compte/PremierMotDePasseForm";
import { compteDuJeton } from "@/lib/activation";

export default async function BienvenuePage({
  params,
}: PageProps<"/bienvenue/[token]">) {
  const { token } = await params;
  const compte = await compteDuJeton(token);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className="mb-2 text-xs tracking-wider text-primary uppercase">
          Bienvenue
        </div>

        {compte ? (
          <>
            <h1 className="mb-3 font-serif text-4xl font-semibold">
              Choisissez votre mot de passe
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              Votre identifiant est{" "}
              <strong className="text-foreground">{compte.email}</strong>. Une
              fois votre mot de passe choisi, vous arrivez directement sur
              votre espace.
            </p>
            <PremierMotDePasseForm jeton={token} />
          </>
        ) : (
          <>
            <h1 className="mb-3 font-serif text-4xl font-semibold">
              Ce lien n&apos;est plus valable
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              Il a peut-être déjà servi, ou dépassé ses 14 jours. Demandez à
              l&apos;association de vous en renvoyer un. Si vous avez déjà
              choisi votre mot de passe, connectez-vous simplement.
            </p>
            <Link
              href="/connexion"
              className="rounded-sm bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
            >
              Aller à la connexion
            </Link>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
