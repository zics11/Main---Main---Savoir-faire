import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transmetteurs, users } from "@/lib/db/schema";

// Jeton d'accueil : le lien envoyé à un nouveau transmetteur pour qu'il
// choisisse lui-même son premier mot de passe. Il ne sert qu'à ça — la
// connexion, elle, se fait toujours par email + mot de passe.

const VALIDITE_JOURS = 14;

/** Seule l'empreinte est stockée : une copie de la base n'ouvre aucun compte. */
function empreinte(jeton: string) {
  return createHash("sha256").update(jeton).digest("hex");
}

/**
 * Remplace le jeton d'accueil du compte et renvoie sa version en clair, à
 * mettre dans le lien. Un nouvel envoi invalide donc le précédent.
 */
export async function creerJetonActivation(userId: string) {
  const jeton = randomBytes(32).toString("base64url");
  await db
    .update(users)
    .set({
      activationToken: empreinte(jeton),
      activationExpires: new Date(Date.now() + VALIDITE_JOURS * 86400_000),
    })
    .where(eq(users.id, userId));
  return jeton;
}

export function lienActivation(jeton: string) {
  return new URL(
    `/bienvenue/${jeton}`,
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();
}

/** Compte visé par ce jeton, ou null s'il est inconnu, périmé ou déjà utilisé. */
export async function compteDuJeton(jeton: string) {
  const attendue = empreinte(jeton);
  const candidats = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      activationToken: true,
      activationExpires: true,
    },
  });

  const user = candidats.find((u) => {
    if (!u.activationToken || u.activationToken.length !== attendue.length) {
      return false;
    }
    return timingSafeEqual(
      Buffer.from(u.activationToken),
      Buffer.from(attendue)
    );
  });

  if (!user?.activationExpires || user.activationExpires < new Date()) {
    return null;
  }
  return { id: user.id, email: user.email };
}

// ─── Changement d'adresse email ───
// Même principe que ci-dessus : le lien part à la NOUVELLE adresse, et la
// connexion ne bascule qu'une fois ce lien cliqué. Une faute de frappe reste
// donc sans conséquence.

const VALIDITE_EMAIL_JOURS = 7;

export async function demanderChangementEmail(userId: string, nouvelEmail: string) {
  const jeton = randomBytes(32).toString("base64url");
  await db
    .update(users)
    .set({
      emailEnAttente: nouvelEmail,
      emailToken: empreinte(jeton),
      emailTokenExpires: new Date(Date.now() + VALIDITE_EMAIL_JOURS * 86400_000),
    })
    .where(eq(users.id, userId));
  return jeton;
}

export function lienConfirmationEmail(jeton: string) {
  return new URL(
    `/confirmer-email/${jeton}`,
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();
}

export async function annulerChangementEmail(userId: string) {
  await db
    .update(users)
    .set({ emailEnAttente: null, emailToken: null, emailTokenExpires: null })
    .where(eq(users.id, userId));
}

/**
 * Applique le changement si le jeton est valide : l'adresse devient celle du
 * compte et celle de la fiche rattachée. Renvoie la nouvelle adresse, ou null
 * si le lien est inconnu, périmé ou déjà utilisé.
 */
export async function confirmerChangementEmail(jeton: string) {
  const attendue = empreinte(jeton);
  const candidats = await db.query.users.findMany({
    columns: {
      id: true,
      emailEnAttente: true,
      emailToken: true,
      emailTokenExpires: true,
    },
  });

  const user = candidats.find((u) => {
    if (!u.emailToken || u.emailToken.length !== attendue.length) return false;
    return timingSafeEqual(Buffer.from(u.emailToken), Buffer.from(attendue));
  });

  if (
    !user?.emailEnAttente ||
    !user.emailTokenExpires ||
    user.emailTokenExpires < new Date()
  ) {
    return null;
  }

  // L'adresse a pu être prise entre-temps par un autre compte.
  const occupant = await db.query.users.findFirst({
    where: eq(users.email, user.emailEnAttente),
  });
  if (occupant && occupant.id !== user.id) return null;

  const nouvelEmail = user.emailEnAttente;
  await db
    .update(users)
    .set({
      email: nouvelEmail,
      emailEnAttente: null,
      emailToken: null,
      emailTokenExpires: null,
    })
    .where(eq(users.id, user.id));
  // La fiche affiche la même adresse : elle suit.
  await db
    .update(transmetteurs)
    .set({ email: nouvelEmail })
    .where(eq(transmetteurs.userId, user.id));

  return nouvelEmail;
}

// ─── Récupération de mot de passe ───
// Mot de passe oublié : un lien à usage unique, valable 2 heures, ouvre la
// page où l'on en choisit un nouveau. Rien ne change tant qu'il n'est pas
// utilisé — demander un lien ne coupe donc l'accès à personne.

const VALIDITE_REINIT_HEURES = 2;

export async function creerJetonReinitialisation(userId: string) {
  const jeton = randomBytes(32).toString("base64url");
  await db
    .update(users)
    .set({
      reinitToken: empreinte(jeton),
      reinitExpires: new Date(Date.now() + VALIDITE_REINIT_HEURES * 3600_000),
    })
    .where(eq(users.id, userId));
  return jeton;
}

export function lienReinitialisation(jeton: string) {
  return new URL(
    `/nouveau-mot-de-passe/${jeton}`,
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();
}

/** Compte visé par ce lien, ou null s'il est inconnu, périmé ou déjà utilisé. */
export async function compteDuJetonReinit(jeton: string) {
  const attendue = empreinte(jeton);
  const candidats = await db.query.users.findMany({
    columns: { id: true, email: true, reinitToken: true, reinitExpires: true },
  });

  const user = candidats.find((u) => {
    if (!u.reinitToken || u.reinitToken.length !== attendue.length) return false;
    return timingSafeEqual(Buffer.from(u.reinitToken), Buffer.from(attendue));
  });

  if (!user?.reinitExpires || user.reinitExpires < new Date()) return null;
  return { id: user.id, email: user.email };
}

/** Pose le nouveau mot de passe et brûle le lien. */
export async function appliquerReinitialisation(
  userId: string,
  empreinteMotDePasse: string
) {
  await db
    .update(users)
    .set({
      passwordHash: empreinteMotDePasse,
      reinitToken: null,
      reinitExpires: null,
    })
    .where(eq(users.id, userId));
}

/** Efface le jeton : le lien ne peut servir qu'une fois. */
export async function consommerJeton(userId: string) {
  await db
    .update(users)
    .set({ activationToken: null, activationExpires: null })
    .where(eq(users.id, userId));
}
