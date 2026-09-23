import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { loginWithPassword } from "./actions";

export default async function ConnexionPage({
  searchParams,
}: PageProps<"/connexion">) {
  const { erreur } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className="mb-2 text-xs tracking-wider text-primary uppercase">
          Connexion
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold">Se connecter</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Avec l&apos;adresse email et le mot de passe reçus par email. Il n&apos;y
          a pas d&apos;inscription libre : les comptes sont créés par
          l&apos;association.
        </p>

        <form action={loginWithPassword} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Adresse email</span>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="vous@exemple.fr"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Mot de passe</span>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {erreur === "identifiants" && (
            <p className="text-sm text-destructive">
              Adresse email ou mot de passe incorrect.
            </p>
          )}
          {erreur === "trop_de_tentatives" && (
            <p className="text-sm text-destructive">
              Trop de tentatives. Réessayez dans 15 minutes.
            </p>
          )}
          <button
            type="submit"
            className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Mot de passe oublié ? Demandez-en un nouveau à l&apos;association :
          elle vous en envoie un par email en un clic.
        </p>
      </main>
      <Footer />
    </div>
  );
}
