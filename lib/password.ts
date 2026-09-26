// Hachage des mots de passe avec scrypt, fourni par Node : pas de dépendance
// native à compiler. Pas d'import "server-only" ici, car le script
// scripts/mot-de-passe-admin.ts s'en sert hors de Next.js — `node:crypto`
// suffit de toute façon à empêcher tout usage côté navigateur.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Réexport : lib/constants.ts est importable depuis le navigateur, pas ce
// fichier (node:crypto).
export { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/constants";

// Paramètres recommandés par l'OWASP pour scrypt (N=2^17, r=8, p=1).
const N = 2 ** 17;
const R = 8;
const P = 1;
const LONGUEUR_CLE = 64;
// scrypt refuse par défaut au-delà de 32 Mo ; N=2^17 et r=8 en demandent ~128.
const MAXMEM = 256 * 1024 * 1024;

function deriver(motDePasse: string, sel: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(motDePasse.normalize("NFKC"), sel, LONGUEUR_CLE, options, (err, cle) =>
      err ? reject(err) : resolve(cle)
    )
  );
}

/** Format stocké : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64). */
export async function hacherMotDePasse(motDePasse: string) {
  const sel = randomBytes(16);
  const cle = await deriver(motDePasse, sel, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, sel.toString("base64"), cle.toString("base64")].join("$");
}

export async function verifierMotDePasse(motDePasse: string, empreinte: string) {
  const [algo, n, r, p, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !sel || !cle) return false;

  const attendue = Buffer.from(cle, "base64");
  const calculee = await deriver(motDePasse, Buffer.from(sel, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return calculee.length === attendue.length && timingSafeEqual(calculee, attendue);
}

// Empreinte factice, vérifiée quand le compte n'existe pas ou n'a pas de mot
// de passe : la réponse prend alors le même temps, et ne trahit pas quelles
// adresses ont un compte.
let empreinteFactice: Promise<string> | null = null;
export function obtenirEmpreinteFactice() {
  empreinteFactice ??= hacherMotDePasse(randomBytes(16).toString("hex"));
  return empreinteFactice;
}
