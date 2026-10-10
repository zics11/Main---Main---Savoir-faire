// Les dons : le vocabulaire commun aux pages, aux encarts et aux emails.
// Le site reste gratuit et sans commission ; il invite à donner à prix libre,
// avec des montants conseillés, juste après les moments où l'on mesure ce
// qu'il apporte. Le moyen de paiement se branche ailleurs (lib/dons-serveur).

/** Les montants proposés, en euros ; celui du milieu est choisi d'avance. */
export const MONTANTS_CONSEILLES = [1, 5, 10] as const;
export const MONTANT_PAR_DEFAUT = 5;

/** La contribution conseillée aux transmetteurs, par an, et ses voisines. */
export const CONTRIBUTION_TRANSMETTEUR = 30;
export const MONTANTS_TRANSMETTEUR = [15, 30, 50] as const;

export const MONTANT_MIN = 1;
export const MONTANT_MAX = 5000;

/**
 * Le don ouvre droit à une réduction d'impôt de 66 % : seulement si la
 * structure peut délivrer des reçus fiscaux (association d'intérêt
 * général). À n'activer qu'une fois ce point vérifié.
 */
export const REDUCTION_IMPOT = false;

/** D'où vient le donateur : pour savoir, plus tard, quel endroit fait donner. */
export const SOURCES_DON = [
  "page",
  "flottant",
  "demande",
  "temoignage",
  "espace",
  "email",
  "email-apprenant",
  "email-transmetteur",
] as const;
export type SourceDon = (typeof SOURCES_DON)[number];

export function estSource(v: unknown): v is SourceDon {
  return SOURCES_DON.includes(v as SourceDon);
}

/** Le lien vers la page Soutenir, montant choisi d'avance s'il y en a un. */
export function lienSoutien(source: SourceDon, montant?: number) {
  const q = new URLSearchParams({ source });
  if (montant) q.set("montant", String(montant));
  return `/soutenir?${q}`;
}

/**
 * Donner tout de suite : droit vers la page de paiement, sans repasser par
 * les explications (voir app/soutenir/don).
 */
export function lienDon(source: SourceDon, montant?: number) {
  const q = new URLSearchParams({ source });
  if (montant) q.set("montant", String(montant));
  return `/soutenir/don?${q}`;
}

/** « En savoir plus » : la partie de la page Soutenir qui explique tout. */
export function lienEnSavoirPlus(source: SourceDon) {
  return `${lienSoutien(source)}#a-quoi-sert`;
}

/** Ce que coûte vraiment le don après la réduction d'impôt de 66 %. */
export function apresReduction(montant: number) {
  return Math.round(montant * 34) / 100;
}

const eurosRonds = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eurosCentimes = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** « 10 € », « 3,40 € ». */
export function enEuros(montant: number) {
  return (Number.isInteger(montant) ? eurosRonds : eurosCentimes).format(
    montant,
  );
}

/** L'encart de don des emails, quand il n'a pas de texte à lui. */
export const TITRE_SOUTIEN = "Un coup de pouce, à prix libre ?";
export const TEXTE_SOUTIEN =
  "Main à Main est gratuit et ne prend aucune commission : il vit de dons. Quelques euros suffisent à faire tenir la prochaine rencontre.";

/** Le nom du témoin posé après un don : on ne redemande pas tout de suite. */
export const TEMOIN_DON = "mam_don";
/** Trois mois sans encart après un don. */
export const DUREE_TEMOIN_DON = 90 * 24 * 3600;
