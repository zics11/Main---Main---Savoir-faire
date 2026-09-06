import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { HauteurEntete } from "./HauteurEntete";
import { NavLink } from "./NavLink";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-5 sm:px-12">
      <Link href="/" className="flex items-baseline gap-2.5">
        <span className="font-serif text-2xl font-bold tracking-tight">
          Main à Main
        </span>
        <span className="hidden text-xs tracking-wider text-muted-foreground uppercase sm:inline">
          savoir-faire manuels
        </span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-medium">
        <NavLink href="/carte">La carte</NavLink>
        <NavLink href="/stages">Les stages</NavLink>
        <NavLink href="/#association">L&apos;association</NavLink>

        <Link
          href="/#transmettre"
          className="rounded-sm border border-primary px-4 py-2 text-primary hover:bg-accent"
        >
          Proposer une transmission
        </Link>

        {!session?.user && (
          <Link href="/connexion" className="text-muted-foreground hover:text-primary">
            Connexion
          </Link>
        )}

        {session?.user?.role === "admin" && (
          <Link href="/admin" className="text-muted-foreground hover:text-primary">
            Administration
          </Link>
        )}

        {session?.user?.role === "transmetteur" && (
          <Link href="/mes-stages" className="text-muted-foreground hover:text-primary">
            Mes stages
          </Link>
        )}

        {session?.user && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-muted-foreground hover:text-primary">
              Se déconnecter
            </button>
          </form>
        )}
      </nav>

      <HauteurEntete />
    </header>
  );
}
