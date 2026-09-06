import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between bg-[#2b2620] px-8 py-4 text-[#faf8f4]">
        <div className="flex items-baseline gap-3">
          <Link href="/admin" className="font-serif text-xl font-bold">
            Main à Main
          </Link>
          <span className="text-xs tracking-wider text-[#d9925f] uppercase">
            administration
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#cfc8bb]">
            Voir le site public
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-[#cfc8bb] hover:text-[#faf8f4]">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-9">
        {children}
      </main>
    </div>
  );
}
