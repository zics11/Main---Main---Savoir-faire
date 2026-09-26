import "server-only";
import { eq } from "drizzle-orm";
import { creerJetonReinitialisation, lienReinitialisation } from "@/lib/activation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { reinitialisationHtml, reinitialisationText } from "@/lib/email";
import { sendMail } from "@/lib/mailer";

/**
 * Envoie le lien « nouveau mot de passe » à une adresse, si un compte y
 * répond. Partagé par la demande publique et par l'administration.
 *
 * Renvoie true dès lors que le traitement s'est déroulé normalement, y
 * compris quand aucun compte ne correspond : la page publique ne doit pas
 * révéler quelles adresses existent.
 */
export async function envoyerLienReinitialisation(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.trim().toLowerCase()),
  });
  if (!user) return true;

  const url = lienReinitialisation(await creerJetonReinitialisation(user.id));
  try {
    await sendMail({
      to: user.email,
      subject: "Choisir un nouveau mot de passe — Main à Main",
      html: reinitialisationHtml(url),
      text: reinitialisationText(url),
    });
    return true;
  } catch (err) {
    console.error(`Password reset email to ${user.email} failed:`, err);
    return false;
  }
}
