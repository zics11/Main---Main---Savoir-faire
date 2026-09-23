import { eq } from "drizzle-orm";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MotDePasseForm } from "@/components/compte/MotDePasseForm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { users } from "@/lib/db/schema";

export default async function MonComptePage() {
  const session = await requireUser();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: { email: true, passwordHash: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-12">
        <div className="mb-2 text-xs tracking-wider text-primary uppercase">
          Mon compte
        </div>
        <h1 className="mb-8 font-serif text-3xl font-semibold">
          {user?.email}
        </h1>

        <MotDePasseForm aUnMotDePasse={user?.passwordHash != null} />
      </main>
      <Footer />
    </div>
  );
}
