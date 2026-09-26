// Codes à usage unique basés sur le temps (TOTP, RFC 6238) — ce que génèrent
// Google Authenticator, 1Password, FreeOTP… Implémenté ici avec `node:crypto`
// plutôt qu'avec une dépendance : l'algorithme tient en quelques lignes.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PAS_SECONDES = 30;
const CHIFFRES = 6;
/** Tolérance d'un pas avant et après : une horloge un peu décalée passe. */
const FENETRE = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function versBase32(octets: Buffer) {
  let bits = 0;
  let valeur = 0;
  let sortie = "";
  for (const octet of octets) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      sortie += BASE32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += BASE32[(valeur << (5 - bits)) & 31];
  return sortie;
}

function depuisBase32(secret: string) {
  let bits = 0;
  let valeur = 0;
  const octets: number[] = [];
  for (const caractere of secret.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    valeur = (valeur << 5) | BASE32.indexOf(caractere);
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(octets);
}

/** Secret partagé avec l'application d'authentification, en base32. */
export function genererSecretTotp() {
  return versBase32(randomBytes(20));
}

/** Adresse otpauth:// à encoder en QR code pour l'enrôlement. */
export function uriOtpauth(secret: string, compte: string) {
  const params = new URLSearchParams({
    secret,
    issuer: "Main à Main",
    algorithm: "SHA1",
    digits: String(CHIFFRES),
    period: String(PAS_SECONDES),
  });
  return `otpauth://totp/${encodeURIComponent(`Main à Main:${compte}`)}?${params}`;
}

function codeAttendu(secret: Buffer, compteur: number) {
  const bloc = Buffer.alloc(8);
  bloc.writeBigUInt64BE(BigInt(compteur));
  const empreinte = createHmac("sha1", secret).update(bloc).digest();
  // Troncature dynamique, telle que décrite par la RFC 4226.
  const decalage = empreinte[empreinte.length - 1] & 0x0f;
  const nombre =
    ((empreinte[decalage] & 0x7f) << 24) |
    (empreinte[decalage + 1] << 16) |
    (empreinte[decalage + 2] << 8) |
    empreinte[decalage + 3];
  return String(nombre % 10 ** CHIFFRES).padStart(CHIFFRES, "0");
}

/** Code attendu à un instant donné — paramétrable pour pouvoir être vérifié
 *  contre les vecteurs de test de la RFC 6238. */
export function codeTotp(secretBase32: string, instantMs = Date.now()) {
  return codeAttendu(
    depuisBase32(secretBase32),
    Math.floor(instantMs / 1000 / PAS_SECONDES)
  );
}

export function verifierCodeTotp(secretBase32: string, saisie: string) {
  const code = saisie.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;

  const secret = depuisBase32(secretBase32);
  const maintenant = Math.floor(Date.now() / 1000 / PAS_SECONDES);
  for (let ecart = -FENETRE; ecart <= FENETRE; ecart++) {
    const attendu = codeAttendu(secret, maintenant + ecart);
    if (timingSafeEqual(Buffer.from(attendu), Buffer.from(code))) return true;
  }
  return false;
}

/** Codes de secours, à conserver si le téléphone est perdu. */
export function genererCodesDeSecours(combien = 8) {
  return Array.from({ length: combien }, () =>
    randomBytes(5).toString("hex").replace(/(.{4})(?=.)/g, "$1-")
  );
}
