import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Preuve que le mot de passe vient d'être vérifié, le temps de saisir le code
// à usage unique. Elle évite de redemander le mot de passe au second écran,
// sans jamais le conserver : c'est une signature courte, liée à l'adresse et
// à une échéance.

const VALIDITE_MS = 5 * 60_000;
export const COOKIE_PRE_AUTH = "pre-auth";

function signature(donnees: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(donnees)
    .digest("base64url");
}

export function creerPreuve(email: string) {
  const donnees = `${email}.${Date.now() + VALIDITE_MS}`;
  return `${donnees}.${signature(donnees)}`;
}

export function preuveValable(preuve: string, email: string) {
  const separateur = preuve.lastIndexOf(".");
  if (separateur < 0) return false;

  const donnees = preuve.slice(0, separateur);
  const fournie = Buffer.from(preuve.slice(separateur + 1));
  const attendue = Buffer.from(signature(donnees));
  if (fournie.length !== attendue.length) return false;
  if (!timingSafeEqual(fournie, attendue)) return false;

  const [emailSigne, echeance] = [
    donnees.slice(0, donnees.lastIndexOf(".")),
    Number(donnees.slice(donnees.lastIndexOf(".") + 1)),
  ];
  return emailSigne === email && Number.isFinite(echeance) && echeance > Date.now();
}
