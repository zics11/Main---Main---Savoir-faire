import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { OubliForm } from "@/components/compte/OubliForm";
import { surtitre } from "@/lib/style";

export default function MotDePasseOubliePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className={`mb-2 ${surtitre}`}>
          Mot de passe oublié
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold">
          Choisir un nouveau mot de passe
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Indiquez l&apos;adresse de votre compte : vous recevrez un lien pour
          en choisir un nouveau. Votre mot de passe actuel reste valable tant
          que vous ne l&apos;avez pas utilisé.
        </p>
        <OubliForm />
      </main>
      <Footer />
    </div>
  );
}
