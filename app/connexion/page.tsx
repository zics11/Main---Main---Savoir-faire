import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FormulaireConnexion } from "@/components/site/FormulaireConnexion";
import { loginWithPassword } from "./actions";

export default async function ConnexionPage({
  searchParams,
}: PageProps<"/connexion">) {
  const { erreur, etape, email } = await searchParams;
  // Deuxième temps : le mot de passe est bon, le compte réclame son code.
  const etapeCode = etape === "code";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className="mb-2 text-xs tracking-wider text-primary uppercase">
          Connexion
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold">Se connecter</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {etapeCode
            ? `Mot de passe vérifié pour ${typeof email === "string" ? email : "votre compte"}. Saisissez le code de votre application d'authentification.`
            : "Avec l'adresse email et le mot de passe reçus par email. Il n'y a pas d'inscription libre : les comptes sont créés par l'association."}
        </p>

        {erreur === "code" && (
          <p className="mb-3 text-sm text-destructive">
            Code incorrect ou expiré. Réessayez avec le code affiché en ce
            moment.
          </p>
        )}
        {erreur === "identifiants" && (
          <p className="mb-3 text-sm text-destructive">
            Adresse email ou mot de passe incorrect.
          </p>
        )}
        {erreur === "trop_de_tentatives" && (
          <p className="mb-3 text-sm text-destructive">
            Trop de tentatives. Réessayez dans 15 minutes.
          </p>
        )}

        <FormulaireConnexion
          action={loginWithPassword}
          etapeCode={etapeCode}
          email={typeof email === "string" ? email : ""}
        />

        <Link
          href="/mot-de-passe-oublie"
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Mot de passe oublié ?
        </Link>
      </main>
      <Footer />
    </div>
  );
}
