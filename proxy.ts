import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Redirect-only gate for UX: keeps signed-out visitors off /admin and
// /mes-stages. This is *not* the security boundary — every Server Action
// and Route Handler re-checks the session itself via lib/dal.ts, since a
// proxy check can never be fully trusted as the only line of defense.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth();

  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }

  if (pathname.startsWith("/mes-stages") && !session?.user) {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mes-stages/:path*"],
};
