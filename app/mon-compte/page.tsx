import { eq } from "drizzle-orm";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DoubleAuthForm } from "@/components/compte/DoubleAuthForm";
import { EmailForm } from "@/components/compte/EmailForm";
import { MotDePasseForm } from "@/components/compte/MotDePasseForm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { users } from "@/lib/db/schema";
import { surtitre } from "@/lib/style";

export default async function MonComptePage() {
  const session = await requireUser();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: {
      email: true,
      passwordHash: true,
      emailEnAttente: true,
      totpActiveLe: true,
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-12">
        <div className={`mb-2 ${surtitre}`}>
          Mon compte
        </div>
        <h1 className="mb-8 font-serif text-3xl font-semibold">
          {user?.email}
        </h1>

        <EmailForm
          email={user?.email ?? ""}
          aUnMotDePasse={user?.passwordHash != null}
          enAttente={user?.emailEnAttente ?? null}
        />

        <MotDePasseForm aUnMotDePasse={user?.passwordHash != null} />

        {/* Réservée à l'association : inutile d'alourdir l'accès des
            transmetteurs. */}
        {session.role === "admin" && (
          <DoubleAuthForm active={user?.totpActiveLe != null} />
        )}
      </main>
      <Footer />
    </div>
  );
}
