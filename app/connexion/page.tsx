import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { requestMagicLink } from "./actions";

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
        <h1 className="mb-3 font-serif text-4xl font-semibold">
          Recevoir mon lien de connexion
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Saisissez votre adresse email. Pas de mot de passe : vous recevrez
          un lien à usage unique pour vous connecter.
        </p>

        <form action={requestMagicLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Adresse email</span>
            <Input type="email" name="email" placeholder="vous@exemple.fr" required />
          </label>
          {erreur === "email" && (
            <p className="text-sm text-destructive">
              Entrez une adresse email valide.
            </p>
          )}
          <button
            type="submit"
            className="mt-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
          >
            Recevoir le lien
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
