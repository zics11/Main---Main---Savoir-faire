import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { confirmerChangementEmail } from "@/lib/activation";
import { bouton, surtitre } from "@/lib/style";

export default async function ConfirmerEmailPage({
  params,
}: PageProps<"/confirmer-email/[token]">) {
  const { token } = await params;
  // La confirmation s'applique ici même : c'est le clic sur le lien qui vaut
  // preuve que la nouvelle adresse est bien relevée par son destinataire.
  const nouvelEmail = await confirmerChangementEmail(token);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <div className={`mb-2 ${surtitre}`}>
          Adresse email
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold">
          {nouvelEmail ? "Adresse confirmée" : "Ce lien n'est plus valable"}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {nouvelEmail ? (
            <>
              Vous vous connectez désormais avec{" "}
              <strong className="text-foreground">{nouvelEmail}</strong>. Votre
              mot de passe, lui, n&apos;a pas changé.
            </>
          ) : (
            <>
              Il a peut-être déjà servi, ou dépassé ses 7 jours. Votre ancienne
              adresse reste valable ; demandez à l&apos;association de relancer
              le changement si besoin.
            </>
          )}
        </p>
        <Link
          href="/connexion"
          className={bouton.primaire}
        >
          Aller à la connexion
        </Link>
      </main>
      <Footer />
    </div>
  );
}
