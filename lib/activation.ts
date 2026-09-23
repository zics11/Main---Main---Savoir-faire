import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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

/** Efface le jeton : le lien ne peut servir qu'une fois. */
export async function consommerJeton(userId: string) {
  await db
    .update(users)
    .set({ activationToken: null, activationExpires: null })
    .where(eq(users.id, userId));
}
