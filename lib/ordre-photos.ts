/**
 * Range les photos dans l'ordre voulu par le formulaire (champ caché
 * « ordrePhotos », en JSON) — la première est la photo d'accueil.
 * « e:chemin » désigne une photo déjà en ligne, « n:2 » la troisième des
 * nouvelles. Un chemin inconnu est ignoré : seules les photos gardées
 * peuvent y figurer. Ce que l'ordre oublierait vient à la suite.
 */
export function ordonnerPhotos(
  formData: FormData,
  gardees: string[],
  ajoutees: string[],
) {
  let refs: unknown[] = [];
  try {
    const brut = JSON.parse(String(formData.get("ordrePhotos") ?? "[]"));
    if (Array.isArray(brut)) refs = brut;
  } catch {
    // Ordre illisible : on garde l'ordre d'arrivée.
  }

  const ordre: string[] = [];
  for (const ref of refs) {
    const texte = String(ref);
    const photo = texte.startsWith("e:")
      ? gardees.find((p) => p === texte.slice(2))
      : texte.startsWith("n:")
        ? ajoutees[Number(texte.slice(2))]
        : undefined;
    if (photo && !ordre.includes(photo)) ordre.push(photo);
  }
  for (const photo of [...gardees, ...ajoutees]) {
    if (!ordre.includes(photo)) ordre.push(photo);
  }
  return ordre;
}
