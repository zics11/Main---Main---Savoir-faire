import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transmetteurs } from "@/lib/db/schema";

// Centralizes the *real* (non-optimistic) auth checks. proxy.ts only
// redirects for UX; every Server Action and Route Handler that reads or
// writes protected data must go through one of these.

export const getSession = cache(async () => {
  return auth();
});

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/connexion");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/connexion");
  return user;
}

// A transmetteur's fiche is looked up by their user id, never by an id
// supplied from the client — this is what makes /mes-stages safe: whatever
// the signed-in transmetteur submits, we always act on *their own* fiche.
export const getMyTransmetteur = cache(async () => {
  const user = await requireUser();
  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.userId, user.id),
  });
  return fiche ?? null;
});

export async function requireMyTransmetteur() {
  const fiche = await getMyTransmetteur();
  if (!fiche) redirect("/mes-stages/aucune-fiche");
  return fiche;
}
