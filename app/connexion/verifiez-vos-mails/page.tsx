import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function VerifiezVosMailsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24 text-center">
        <h1 className="mb-3 font-serif text-3xl font-semibold">
          Vérifiez vos emails
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Si cette adresse est associée à un compte, un lien de connexion
          vient de lui être envoyé. Il est valable 24 heures et ne peut
          servir qu&apos;une fois.
        </p>
      </main>
      <Footer />
    </div>
  );
}
