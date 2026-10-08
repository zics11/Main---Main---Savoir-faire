/** Deux lettres tirées d'un nom, à défaut de portrait : « Élise Rouvier » → « ÉR ». */
export function initiales(nom: string) {
  return (
    nom
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((mot) => mot[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?"
  );
}
