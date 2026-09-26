"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  hacherMotDePasse,
  LONGUEUR_MIN_MOT_DE_PASSE,
  verifierMotDePasse,
} from "@/lib/password";
import {
  alerteAdresseEmailHtml,
  alerteAdresseEmailText,
  changementEmailHtml,
  changementEmailText,
} from "@/lib/email";
import {
  annulerChangementEmail,
  demanderChangementEmail,
  lienConfirmationEmail,
} from "@/lib/activation";
import { sendMail } from "@/lib/mailer";
import QRCode from "qrcode";
import { genererSecretTotp, uriOtpauth, verifierCodeTotp } from "@/lib/totp";
import { enregistrerCodesDeSecours } from "@/lib/totp-comptes";

export type CompteState = { ok: boolean; message: string } | null;

/**
 * Définit ou remplace le mot de passe du compte connecté. L'ancien est exigé
 * dès qu'il y en a un : une session laissée ouverte ne doit pas suffire à
 * changer les clés du compte.
 */
export async function definirMotDePasse(
  _prev: CompteState,
  formData: FormData
): Promise<CompteState> {
  const user = await requireUser();
  const motDePasse = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const compte = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: true },
  });
  if (compte?.passwordHash) {
    const ancien = String(formData.get("ancien") ?? "");
    if (!(await verifierMotDePasse(ancien, compte.passwordHash))) {
      return { ok: false, message: "Mot de passe actuel incorrect." };
    }
  }

  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return {
      ok: false,
      message: `Trop court : ${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.`,
    };
  }
  if (motDePasse !== confirmation) {
    return { ok: false, message: "Les deux saisies ne correspondent pas." };
  }

  // Pas de confirmation par email ici : l'ancien mot de passe vient d'être
  // saisi, il prouve l'identité. Celui qui l'a oublié passe par le mail de
  // récupération.
  await db
    .update(users)
    .set({ passwordHash: await hacherMotDePasse(motDePasse) })
    .where(eq(users.id, user.id));

  revalidatePath("/mon-compte");
  return {
    ok: true,
    message: "Mot de passe modifié. Il sert dès votre prochaine connexion.",
  };
}

/**
 * Changement d'adresse par le titulaire du compte, avec trois garde-fous :
 * son mot de passe est redemandé, une alerte part à l'adresse actuelle, et
 * la nouvelle ne devient l'identifiant qu'après le clic sur son lien de
 * confirmation.
 */
export async function changerMonEmail(
  _prev: CompteState,
  formData: FormData
): Promise<CompteState> {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, message: "Adresse email invalide." };
  }
  if (email === user.email) {
    return { ok: false, message: "C'est déjà votre adresse." };
  }

  // Une session laissée ouverte ne suffit pas à déplacer un compte.
  const compte = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: true },
  });
  if (compte?.passwordHash) {
    const motDePasse = String(formData.get("motDePasse") ?? "");
    if (!(await verifierMotDePasse(motDePasse, compte.passwordHash))) {
      return { ok: false, message: "Mot de passe incorrect." };
    }
  }

  const occupant = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (occupant && occupant.id !== user.id) {
    return {
      ok: false,
      message: "Cette adresse est déjà utilisée par un autre compte.",
    };
  }

  const jeton = await demanderChangementEmail(user.id, email);
  try {
    const url = lienConfirmationEmail(jeton);
    await sendMail({
      to: email,
      subject: "Confirmez votre nouvelle adresse — Main à Main",
      html: changementEmailHtml(user.name ?? email, url),
      text: changementEmailText(user.name ?? email, url),
    });
  } catch (err) {
    console.error(`Email change confirmation to ${email} failed:`, err);
    await annulerChangementEmail(user.id);
    return {
      ok: false,
      message: "L'email de confirmation n'a pas pu partir : rien n'a été changé.",
    };
  }

  // Alerte à l'adresse actuelle : si la demande ne vient pas du titulaire,
  // c'est ainsi qu'il s'en aperçoit.
  await sendMail({
    to: user.email!,
    subject: "Changement d'adresse demandé sur votre compte — Main à Main",
    html: alerteAdresseEmailHtml(email),
    text: alerteAdresseEmailText(email),
  }).catch((err) =>
    console.error(`Address change alert to ${user.email} failed:`, err)
  );

  revalidatePath("/mon-compte");
  return {
    ok: true,
    message: `Un lien de confirmation vient de partir à ${email}. Votre adresse changera dès que vous aurez cliqué dessus ; d'ici là, l'actuelle reste votre identifiant. Une alerte a aussi été envoyée à ${user.email}.`,
  };
}

/** Abandonne un changement non confirmé. */
export async function annulerMonChangementEmail(): Promise<CompteState> {
  const user = await requireUser();
  await annulerChangementEmail(user.id);
  revalidatePath("/mon-compte");
  return { ok: true, message: "Changement d'adresse annulé." };
}

// ─── Double authentification (code d'application) ───
// Réservée aux comptes de l'association : pour les transmetteurs, un mot de
// passe et la récupération par email suffisent, sans compliquer leur usage.

export type TotpState =
  | { ok: false; message: string }
  | { ok: true; message: string; codes?: string[] }
  | null;

/**
 * Prépare l'activation : un secret est tiré et proposé sous forme de QR code.
 * Il n'est enregistré comme actif qu'une fois un premier code vérifié, sinon
 * on risquerait de verrouiller un compte sur une application mal configurée.
 */
export async function preparerDoubleAuthentification() {
  const user = await requireAdmin();
  const secret = genererSecretTotp();
  // Rangé à part : tant qu'aucun code ne l'a validé, la protection en place
  // (s'il y en a une) continue de s'appliquer telle quelle.
  await db
    .update(users)
    .set({ totpSecretEnAttente: secret })
    .where(eq(users.id, user.id));

  const uri = uriOtpauth(secret, user.email!);
  return { secret, uri, qr: await QRCode.toString(uri, { type: "svg", margin: 1 }) };
}

/** Vérifie un premier code : c'est ce qui rend la protection effective. */
export async function activerDoubleAuthentification(
  _prev: TotpState,
  formData: FormData
): Promise<TotpState> {
  const user = await requireAdmin();
  const compte = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { totpSecretEnAttente: true },
  });
  if (!compte?.totpSecretEnAttente) {
    return { ok: false, message: "Recommencez l'activation." };
  }
  if (
    !verifierCodeTotp(
      compte.totpSecretEnAttente,
      String(formData.get("code") ?? "")
    )
  ) {
    return { ok: false, message: "Code incorrect. Vérifiez l'heure de votre téléphone." };
  }

  await db
    .update(users)
    .set({
      totpSecret: compte.totpSecretEnAttente,
      totpSecretEnAttente: null,
      totpActiveLe: new Date(),
    })
    .where(eq(users.id, user.id));
  const codes = await enregistrerCodesDeSecours(user.id);

  revalidatePath("/mon-compte");
  return {
    ok: true,
    message: "Double authentification activée. Conservez vos codes de secours.",
    codes,
  };
}

/** Désactivation, sous réserve du mot de passe et d'un code valide. */
export async function desactiverDoubleAuthentification(
  _prev: TotpState,
  formData: FormData
): Promise<TotpState> {
  const user = await requireAdmin();
  const compte = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: true, totpSecret: true },
  });
  if (!compte?.totpSecret) return { ok: false, message: "Elle n'est pas activée." };

  if (compte.passwordHash) {
    const motDePasse = String(formData.get("motDePasse") ?? "");
    if (!(await verifierMotDePasse(motDePasse, compte.passwordHash))) {
      return { ok: false, message: "Mot de passe incorrect." };
    }
  }
  if (!verifierCodeTotp(compte.totpSecret, String(formData.get("code") ?? ""))) {
    return { ok: false, message: "Code incorrect." };
  }

  await db
    .update(users)
    .set({
      totpSecret: null,
      totpSecretEnAttente: null,
      totpActiveLe: null,
      totpCodesSecours: [],
    })
    .where(eq(users.id, user.id));

  revalidatePath("/mon-compte");
  return { ok: true, message: "Double authentification désactivée." };
}
