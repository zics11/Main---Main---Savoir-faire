import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { transmetteurs } from "@/lib/db/schema";
import { HauteurEntete } from "./HauteurEntete";
import { NavigationSite } from "./NavigationSite";

export async function Header() {
  const session = await auth();
  const role = session?.user?.role;

  // Chaque rôle a son espace ; le menu n'en montre qu'un.
  const espace =
    role === "admin"
      ? { href: "/admin", label: "Administration" }
      : role === "transmetteur"
        ? { href: "/mes-stages", label: "Mon espace" }
        : null;

  // La fiche rattachée au compte donne le visage et le nom du menu. Un compte
  // de l'association n'en a pas : ses initiales suffiront.
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
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-border bg-background px-6 py-4 sm:px-12 lg:px-8 xl:px-12">
      <Link
        href="/"
        className="font-serif text-2xl font-bold tracking-tight whitespace-nowrap xl:text-3xl"
      >
        Main à Main
      </Link>

      <NavigationSite
        espace={espace}
        email={session?.user?.email ?? null}
        nom={fiche?.nom ?? null}
        portrait={fiche?.photoPortrait ?? null}
        deconnexion={deconnexion}
      />

      <HauteurEntete />
    </header>
  );
}
