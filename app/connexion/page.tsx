import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FormulaireConnexion } from "@/components/site/FormulaireConnexion";
import { connexion } from "./actions";
import { surtitre } from "@/lib/style";

export default function ConnexionPage() {
  // La même page qu'en modale, en plein écran : c'est ici qu'atterrissent les
  // liens directs et les pages protégées qui réclament une connexion.
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className={`mb-2 ${surtitre}`}>
          Connexion
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold">Se connecter</h1>
        <FormulaireConnexion action={connexion} />
      </main>
      <Footer />
    </div>
  );
}
