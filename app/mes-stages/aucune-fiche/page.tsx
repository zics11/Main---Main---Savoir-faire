import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { requireUser } from "@/lib/dal";

export default async function AucuneFichePage() {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24 text-center">
        <h1 className="mb-3 font-serif text-3xl font-semibold">
          Aucune fiche ne vous est encore rattachée
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Votre compte n&apos;est lié à aucune fiche de transmetteur pour le
          moment. Contactez l&apos;association pour faire créer la vôtre.
        </p>
      </main>
      <Footer />
    </div>
  );
}
