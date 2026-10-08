import { eq } from "drizzle-orm";
import Link from "next/link";
import { NavigationAdmin } from "@/components/admin/NavigationAdmin";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { transmetteurs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const session = await auth();

  // Comme sur le site public, la fiche rattachée au compte donne le visage du
  // menu ; un compte de l'association n'en a pas et montre ses initiales.
  const fiche = session?.user?.id
    ? await db.query.transmetteurs.findFirst({
        where: eq(transmetteurs.userId, session.user.id),
        columns: { nom: true, photoPortrait: true },
      })
    : null;

  async function deconnexion() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 bg-[#2b2620] px-8 py-4 text-[#faf8f4]">
        <Link href="/admin" className="flex items-baseline gap-3">
          <span className="font-serif text-2xl font-bold whitespace-nowrap xl:text-3xl">
            Main à Main
          </span>
          <span className="text-xs tracking-wider text-[#d9925f] uppercase">
            administration
          </span>
        </Link>

        <NavigationAdmin
          email={session?.user?.email ?? ""}
          nom={fiche?.nom ?? null}
          portrait={fiche?.photoPortrait ?? null}
          deconnexion={deconnexion}
        />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-9">
        {children}
      </main>
    </div>
  );
}
