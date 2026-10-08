/**
 * Le lieu d'une fiche s'écrit en trois morceaux : la commune et son code
 * postal, exigés pour toute mise en ligne, et un complément libre et
 * facultatif (« Sarthe (72) », « sur le plateau »).
 *
 * L'adresse exacte, elle, n'est jamais demandée : la carte se contente du
 * point posé par le transmetteur.
 */
export type Lieu = {
  ville: string | null;
  codePostal: string | null;
  lieuApproximatif: string | null;
};

/** Un code postal français : cinq chiffres, 01000 à 98890. */
export function codePostalValide(valeur: string) {
  return /^\d{5}$/.test(valeur) && valeur !== "00000";
}

/**
 * Le lieu tel qu'il s'affiche partout (fiche, carte, listes) :
 * « Lagrasse (11220), Aude ». Les fiches d'archive, qui n'ont encore que
 * leur ancien libellé, le gardent tel quel.
 */
/**
 * Le lieu en version courte, pour les vignettes et les bulles de la carte :
 * « Lagrasse (11220) ». Le complément reste sur la fiche. Une fiche qui n'a
 * encore que son ancien libellé le garde.
 */
export function libelleLieuCourt(lieu: Lieu) {
  if (lieu.ville && lieu.codePostal)
    return `${lieu.ville} (${lieu.codePostal})`;
  return libelleLieu(lieu);
}

export function libelleLieu(lieu: Lieu) {
  const commune =
    lieu.ville && lieu.codePostal
      ? `${lieu.ville} (${lieu.codePostal})`
      : lieu.ville;
  return [commune, lieu.lieuApproximatif].filter(Boolean).join(", ");
}
