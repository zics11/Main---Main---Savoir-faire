import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const COOKIES_SESSION = ["authjs.session-token", "__Secure-authjs.session-token"];

// Depuis le passage aux sessions JWT, un navigateur peut encore porter
// l'ancien cookie (un simple identifiant de session en base). Auth.js ne sait
// pas le lire et tente de l'effacer, mais un Server Component ne peut pas
// toucher aux cookies : l'erreur JWTSessionError revenait à chaque page. Un
// JWT chiffré (JWE compact) compte toujours 5 segments séparés par des points.
function cookiesPerimes(req: NextRequest) {
  return COOKIES_SESSION.filter((nom) => {
    const valeur = req.cookies.get(nom)?.value;
    return valeur !== undefined && valeur.split(".").length !== 5;
  });
}

async function controlerAcces(req: NextRequest, sessionPerimee: boolean) {
  const { pathname } = req.nextUrl;
  const protege =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mes-stages") ||
    pathname.startsWith("/mon-compte");
  if (!protege) return null;

  // Cookie périmé = pas de session : inutile d'interroger Auth.js.
  const session = sessionPerimee ? null : await auth();

  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }
  if (!pathname.startsWith("/admin") && !session?.user) {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }
  return null;
}

// Redirect-only gate for UX: keeps signed-out visitors off /admin,
// /mes-stages and /mon-compte. This is *not* the security boundary — every Server Action
// and Route Handler re-checks the session itself via lib/dal.ts, since a
// proxy check can never be fully trusted as the only line of defense.
export async function proxy(req: NextRequest) {
  const perimes = cookiesPerimes(req);
  // Retiré aussi de la requête, pour que le rendu de cette page ne le voie pas.
  for (const nom of perimes) req.cookies.delete(nom);

  const reponse =
    (await controlerAcces(req, perimes.length > 0)) ??
    NextResponse.next({ request: { headers: req.headers } });

  for (const nom of perimes) reponse.cookies.delete(nom);
  return reponse;
}

export const config = {
  // Toutes les pages (le cookie périmé peut surgir n'importe où), sauf les
  // routes Auth.js, les fichiers statiques et les images.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
