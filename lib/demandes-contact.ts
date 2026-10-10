import "server-only";
import { createHmac } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { demandesContact } from "@/lib/db/schema";

// Les demandes de contact passées par le site, sans rien de lisible sur
// l'apprenant : elles servent à dire au transmetteur combien lui sont
// parvenues, et à ne pas faire du site un relais de courriels — une même
// adresse ne reçoit qu'un nombre limité de confirmations par jour.

/**
 * Confirmations envoyées à une même adresse, au plus, en 24 heures : assez
 * pour qui écrit à plusieurs transmetteurs dans la journée. Pas de limite en
 * développement, où l'on teste avec la même adresse.
 */
const CONFIRMATIONS_PAR_JOUR =
  process.env.NODE_ENV === "production" ? 10 : Infinity;

/** L'adresse n'est gardée qu'en empreinte, salée par le secret du site. */
function empreinte(email: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

/**
 * Note une demande partie chez un transmetteur. Dit s'il reste permis
 * d'envoyer une confirmation à l'apprenant.
 */
export async function noterDemande(demande: {
  transmetteurId: string;
  stageId: string | null;
  email: string;
}) {
  const emailEmpreinte = empreinte(demande.email);
  const [{ n }] = await db
    .select({ n: count() })
    .from(demandesContact)
    .where(
      and(
        eq(demandesContact.emailEmpreinte, emailEmpreinte),
        eq(demandesContact.confirmee, true),
        gte(demandesContact.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  const [{ id }] = await db
    .insert(demandesContact)
    .values({
      transmetteurId: demande.transmetteurId,
      stageId: demande.stageId,
      emailEmpreinte,
    })
    .returning({ id: demandesContact.id });
  return { id, confirmer: n < CONFIRMATIONS_PAR_JOUR };
}

/** La confirmation est partie : elle compte dans la limite du jour. */
export async function marquerConfirmee(id: string) {
  await db
    .update(demandesContact)
    .set({ confirmee: true })
    .where(eq(demandesContact.id, id));
}

/** Combien de demandes sont parvenues à cette fiche par le site. */
export async function demandesRecues(transmetteurId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(demandesContact)
    .where(eq(demandesContact.transmetteurId, transmetteurId));
  return n;
}
